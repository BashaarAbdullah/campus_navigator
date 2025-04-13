class SVGEditor {
    constructor(containerId, initialData) {
        this.container = document.getElementById(containerId);
        this.svgElement = this.container.querySelector('svg');
        this.mode = 'add-node';
        this.selectedNode = null;
        this.nodeData = initialData.nodes || {};
        this.edgeData = initialData.edges || {};
        this.nodeElements = {};
        this.edgeElements = {};
        this.dragState = null;

        this.init();
    }

    init() {
        this.setupViewBox();
        this.setupControls();
        this.loadExistingData();
        this.setupEventListeners();
    }

    setupViewBox() {
        if (!this.svgElement.hasAttribute('viewBox')) {
            const width = this.svgElement.getAttribute('width') || 1000;
            const height = this.svgElement.getAttribute('height') || 800;
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
    }

    setupControls() {
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', (e) => this.setMode(e.currentTarget.id));
        });
        
        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('reset-map').addEventListener('click', () => this.resetMap());
    }

    setMode(mode) {
        this.mode = mode.replace('-mode', '');
        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        document.getElementById(mode).classList.add('active');
        this.clearSelection();
    }

    setupEventListeners() {
        this.svgElement.addEventListener('click', (e) => this.handleClick(e));
        this.svgElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svgElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svgElement.addEventListener('mouseup', () => this.handleMouseUp());
        document.addEventListener('keydown', (e) => e.key === 'Delete' && this.deleteSelected());
    }

    handleClick(e) {
        const point = this.getSVGPoint(e);
        switch(this.mode) {
            case 'add-node': this.addNode(point.x, point.y); break;
            case 'add-edge': this.handleEdgeCreation(e); break;
            case 'delete': this.handleDeletion(e.target); break;
        }
    }

    // Full node/edge management implementation
    addNode(x, y) {
        const nodeId = `node_${Date.now()}`;
        this.nodeData[nodeId] = {
            x: Math.round(x),
            y: Math.round(y),
            type: 'room',
            name: `Node ${Object.keys(this.nodeData).length + 1}`
        };
        this.createNodeElement(nodeId);
        this.selectNode(nodeId);
    }

    createNodeElement(nodeId) {
        const node = this.nodeData[nodeId];
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.classList.add('node');
        group.dataset.nodeId = nodeId;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', 10);
        circle.setAttribute('fill', this.getNodeColor(node.type));

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', node.x);
        text.setAttribute('y', node.y + 5);
        text.textContent = nodeId.slice(-3);
        
        group.append(circle, text);
        this.svgElement.append(group);
        this.nodeElements[nodeId] = group;
    }

    handleEdgeCreation(e) {
        const node = e.target.closest('.node');
        if (!node) return;
        
        const nodeId = node.dataset.nodeId;
        if (!this.selectedNode) {
            this.selectNode(nodeId);
        } else if (this.selectedNode !== nodeId) {
            this.createEdge(this.selectedNode, nodeId);
            this.selectNode(nodeId);
        }
    }

    createEdge(sourceId, targetId) {
        (this.edgeData[sourceId] = this.edgeData[sourceId] || []).push(targetId);
        this.updateEdges();
    }

    updateEdges() {
        // Remove existing edges
        Object.values(this.edgeElements).forEach(edge => edge.remove());
        this.edgeElements = {};

        // Draw new edges
        Object.entries(this.edgeData).forEach(([sourceId, targets]) => {
            targets.forEach(targetId => {
                if (!this.nodeData[sourceId] || !this.nodeData[targetId]) return;
                
                const edgeId = `${sourceId}-${targetId}`;
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute('x1', this.nodeData[sourceId].x);
                line.setAttribute('y1', this.nodeData[sourceId].y);
                line.setAttribute('x2', this.nodeData[targetId].x);
                line.setAttribute('y2', this.nodeData[targetId].y);
                line.classList.add('edge');
                
                this.svgElement.append(line);
                this.edgeElements[edgeId] = line;
            });
        });
    }

    saveMap() {
        const currentFloor = document.getElementById('floor-select')?.value || 1;
        const mapName = `building_${window.mapData.name.split('_')[1]}_floor${currentFloor}`;
        
        fetch('/admin/api/save_map', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                map: mapName,
                nodes: this.nodeData,
                edges: this.edgeData
            })
        }).then(response => {
            if (response.ok) alert('Map saved successfully!');
        });
    }

    resetMap() {
        if (confirm('Discard all changes?')) window.location.reload();
    }

    // Additional helper methods
    getSVGPoint(e) {
        const pt = this.svgElement.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
    }

    getNodeColor(type) {
        const colors = {
            room: '#6f42c1',
            staircase: '#007bff',
            elevator: '#dc3545',
            entrance: '#28a745',
            landmark: '#fd7e14'
        };
        return colors[type] || '#6c757d';
    }

    selectNode(nodeId) {
        this.clearSelection();
        this.selectedNode = nodeId;
        this.nodeElements[nodeId].classList.add('selected');
    }

    clearSelection() {
        this.selectedNode = null;
        document.querySelectorAll('.node').forEach(node => node.classList.remove('selected'));
    }

    deleteSelected() {
        if (this.selectedNode) this.deleteNode(this.selectedNode);
    }

    deleteNode(nodeId) {
        delete this.nodeData[nodeId];
        this.nodeElements[nodeId].remove();
        delete this.nodeElements[nodeId];
        
        // Remove connected edges
        Object.keys(this.edgeData).forEach(sourceId => {
            this.edgeData[sourceId] = this.edgeData[sourceId].filter(id => id !== nodeId);
        });
        delete this.edgeData[nodeId];
        
        this.updateEdges();
    }

    handleDeletion(target) {
        const node = target.closest('.node');
        const edge = target.closest('.edge');
        if (node) this.deleteNode(node.dataset.nodeId);
        if (edge) edge.remove();
    }

    // Drag handling
    handleMouseDown(e) {
        const node = e.target.closest('.node');
        if (node && this.mode !== 'add-edge') {
            this.dragState = {
                nodeId: node.dataset.nodeId,
                startX: e.clientX,
                startY: e.clientY,
                originalX: this.nodeData[node.dataset.nodeId].x,
                originalY: this.nodeData[node.dataset.nodeId].y
            };
        }
    }

    handleMouseMove(e) {
        if (this.dragState && e.buttons === 1) {
            const dx = e.clientX - this.dragState.startX;
            const dy = e.clientY - this.dragState.startY;
            const pt = this.svgElement.createSVGPoint();
            pt.x = dx;
            pt.y = dy;
            const delta = pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
            
            const node = this.nodeData[this.dragState.nodeId];
            node.x = Math.round(this.dragState.originalX + delta.x);
            node.y = Math.round(this.dragState.originalY + delta.y);
            
            this.nodeElements[this.dragState.nodeId].setAttribute('transform', `translate(${node.x},${node.y})`);
            this.updateEdges();
        }
    }

    handleMouseUp() {
        this.dragState = null;
    }

    loadExistingData() {
        Object.keys(this.nodeData).forEach(nodeId => this.createNodeElement(nodeId));
        this.updateEdges();
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('svg-editor')) {
        new SVGEditor('svg-editor', window.mapData);
    }
});