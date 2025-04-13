<script>
class SVGEditor {
    constructor(containerId, initialData) {
        this.container = document.getElementById(containerId);
        this.svgElement = this.container.querySelector('svg');
        this.mode = 'add-node';
        this.selectedNode = null;
        this.tempEdge = null;
        this.nodeData = initialData.nodes || {};
        this.edgeData = initialData.edges || {};
        this.nodeElements = {};
        this.edgeElements = {};
        this.init();
    }

    init() {
        if (!this.svgElement.hasAttribute('viewBox') &&
            this.svgElement.hasAttribute('width') &&
            this.svgElement.hasAttribute('height')) {
            const width = this.svgElement.getAttribute('width');
            const height = this.svgElement.getAttribute('height');
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        this.setupControls();
        this.loadExistingData();
        this.setupEventListeners();
    }

    setupControls() {
        document.getElementById('add-node').addEventListener('click', () => this.setMode('add-node'));
        document.getElementById('add-edge').addEventListener('click', () => this.setMode('add-edge'));
        document.getElementById('delete-mode').addEventListener('click', () => this.setMode('delete'));

        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('fit-view').addEventListener('click', () => this.fitView());

        document.getElementById('update-node').addEventListener('click', () => this.updateNodeProperties());
        document.getElementById('delete-node').addEventListener('click', () => this.deleteSelectedNode());

        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('reset-map').addEventListener('click', () => this.resetMap());
    }

    setMode(mode) {
        this.mode = mode;

        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        const btn = document.getElementById(mode);
        if (btn) btn.classList.add('active');

        if (this.tempEdge) {
            this.svgElement.removeChild(this.tempEdge);
            this.tempEdge = null;
        }

        if (this.selectedNode) {
            this.nodeElements[this.selectedNode].classList.remove('selected');
            this.selectedNode = null;
            this.updateSelectionDisplay();
        }
    }

    setupEventListeners() {
        this.svgElement.addEventListener('click', (e) => {
            const point = this.getSVGPoint(e);
            switch(this.mode) {
                case 'add-node':
                    this.addNode(point.x, point.y);
                    break;
                case 'add-edge':
                    this.handleEdgeCreation(e, point);
                    break;
                case 'delete':
                    this.handleDeletion(e.target);
                    break;
            }
        });

        this.svgElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node')) e.preventDefault();
        });

        this.svgElement.addEventListener('mousemove', (e) => {
            if (e.buttons === 1 && this.selectedNode) {
                const point = this.getSVGPoint(e);
                this.moveNode(this.selectedNode, point.x, point.y);
            }
        });
    }

    getSVGPoint(event) {
        const pt = this.svgElement.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        return pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
    }

    addNode(x, y) {
        const nodeId = `node_${Object.keys(this.nodeData).length + 1}`;
        this.nodeData[nodeId] = {
            name: `New Node ${Object.keys(this.nodeData).length + 1}`,
            type: 'room',
            x: Math.round(x),
            y: Math.round(y)
        };
        this.createNodeElement(nodeId);
        this.selectNode(nodeId);
    }

    createNodeElement(nodeId) {
        const node = this.nodeData[nodeId];
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "node");
        group.setAttribute("data-node-id", nodeId);

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "10");
        circle.setAttribute("fill", this.getNodeColor(node.type));

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "white");
        text.textContent = nodeId.substring(5);

        group.appendChild(circle);
        group.appendChild(text);
        this.svgElement.appendChild(group);
        this.nodeElements[nodeId] = group;
    }

    getNodeColor(type) {
        const colors = {
            'room': '#6a0dad',
            'staircase': '#2196F3',
            'entrance': '#4CAF50',
            'landmark': '#FF9800'
        };
        return colors[type] || '#9c27b0';
    }

    selectNode(nodeId) {
        if (this.selectedNode) {
            this.nodeElements[this.selectedNode].classList.remove('selected');
        }
        this.selectedNode = nodeId;
        this.nodeElements[nodeId].classList.add('selected');
        this.updatePropertiesPanel();
        this.updateSelectionDisplay();
    }

    updatePropertiesPanel() {
        const node = this.nodeData[this.selectedNode];
        document.getElementById('node-id').value = this.selectedNode;
        document.getElementById('node-name').value = node.name;
        document.getElementById('node-type').value = node.type;
    }

    updateSelectionDisplay() {
        const display = document.getElementById('selected-node');
        display.textContent = this.selectedNode
            ? `${this.nodeData[this.selectedNode].name} (${this.selectedNode})`
            : 'None';
    }

    updateNodeProperties() {
        if (!this.selectedNode) return;
        const node = this.nodeData[this.selectedNode];
        node.name = document.getElementById('node-name').value;
        node.type = document.getElementById('node-type').value;
        const group = this.nodeElements[this.selectedNode];
        group.querySelector('circle').setAttribute('fill', this.getNodeColor(node.type));
        group.querySelector('text').textContent = this.selectedNode.substring(5);
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return;
        delete this.nodeData[this.selectedNode];

        Object.keys(this.edgeData).forEach(sourceId => {
            if (sourceId === this.selectedNode) {
                delete this.edgeData[sourceId];
            } else {
                this.edgeData[sourceId] = this.edgeData[sourceId].filter(
                    targetId => targetId !== this.selectedNode
                );
            }
        });

        this.svgElement.removeChild(this.nodeElements[this.selectedNode]);
        delete this.nodeElements[this.selectedNode];
        this.updateEdgeVisuals();
        this.selectedNode = null;
        this.updateSelectionDisplay();
    }

    handleEdgeCreation(event, point) {
        const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
        const nodeGroup = clickedElement.closest('.node');
        if (nodeGroup) {
            const nodeId = nodeGroup.getAttribute('data-node-id');
            if (!this.selectedNode) {
                this.selectNode(nodeId);
            } else if (this.selectedNode !== nodeId) {
                this.addEdge(this.selectedNode, nodeId);
                this.selectNode(nodeId);
            }
        }
    }

    addEdge(sourceId, targetId) {
        if (!this.edgeData[sourceId]) this.edgeData[sourceId] = [];
        if (!this.edgeData[sourceId].includes(targetId)) {
            this.edgeData[sourceId].push(targetId);
            this.updateEdgeVisuals();
        }
    }

    updateEdgeVisuals() {
        Object.values(this.edgeElements).forEach(edge => {
            if (edge.parentNode) edge.parentNode.removeChild(edge);
        });
        this.edgeElements = {};

        Object.entries(this.edgeData).forEach(([sourceId, targetIds]) => {
            if (!this.nodeData[sourceId]) return;
            targetIds.forEach(targetId => {
                if (!this.nodeData[targetId]) return;

                const edgeId = `${sourceId}-${targetId}`;
                const reverseEdgeId = `${targetId}-${sourceId}`;
                if (this.edgeElements[edgeId] || this.edgeElements[reverseEdgeId]) return;

                const source = this.nodeData[sourceId];
                const target = this.nodeData[targetId];

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", source.x);
                line.setAttribute("y1", source.y);
                line.setAttribute("x2", target.x);
                line.setAttribute("y2", target.y);
                line.setAttribute("class", "edge");
                line.setAttribute("data-edge-id", edgeId);

                this.svgElement.appendChild(line);
                this.edgeElements[edgeId] = line;
            });
        });
    }

    handleDeletion(element) {
        const nodeGroup = element.closest('.node');
        const edgeElement = element.closest('.edge');

        if (nodeGroup) {
            const nodeId = nodeGroup.getAttribute('data-node-id');
            if (this.selectedNode === nodeId) this.deleteSelectedNode();
        } else if (edgeElement) {
            const edgeId = edgeElement.getAttribute('data-edge-id');
            const [sourceId, targetId] = edgeId.split('-');
            if (this.edgeData[sourceId]) {
                this.edgeData[sourceId] = this.edgeData[sourceId].filter(id => id !== targetId);
            }
            this.svgElement.removeChild(edgeElement);
            delete this.edgeElements[edgeId];
        }
    }

    moveNode(nodeId, x, y) {
        const node = this.nodeData[nodeId];
        node.x = Math.round(x);
        node.y = Math.round(y);
        const group = this.nodeElements[nodeId];
        const circle = group.querySelector('circle');
        const text = group.querySelector('text');
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y + 5);
        this.updateEdgeVisuals();
    }

    zoom(factor) {
        const viewBox = this.svgElement.getAttribute('viewBox').split(' ').map(Number);
        const newWidth = viewBox[2] / factor;
        const newHeight = viewBox[3] / factor;
        const newX = viewBox[0] + (viewBox[2] - newWidth) / 2;
        const newY = viewBox[1] + (viewBox[3] - newHeight) / 2;
        this.svgElement.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
    }

    fitView() {
        const width = this.svgElement.getAttribute('width');
        const height = this.svgElement.getAttribute('height');
        this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    loadExistingData() {
        Object.keys(this.nodeData).forEach(nodeId => {
            this.createNodeElement(nodeId);
        });
        this.updateEdgeVisuals();
    }

    saveMap() {
        const currentFloor = document.getElementById('floor-select')?.value || '1';
        const mapName = window.mapData?.name || 'defaultMap';
        const mapType = window.mapData?.type || 'building';

        fetch('/admin/api/save_map', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                map: mapName + (mapType === 'building' ? `_floor${currentFloor}` : ''),
                nodes: this.nodeData,
                edges: this.edgeData
            })
        })
        .then(res => res.json())
        .then(data => alert('Map saved successfully!'))
        .catch(err => {
            console.error(err);
            alert('Error saving map.');
        });
    }

    resetMap() {
        if (confirm('Are you sure you want to reset all changes?')) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('floor', document.getElementById('floor-select')?.value || '1');
            window.location.href = window.location.pathname + '?' + urlParams.toString();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('svg-editor')) {
        window.editor = new SVGEditor('svg-editor', window.mapData || { nodes: {}, edges: {} });
    }
});
</script>
