class SVGEditor {
    constructor(containerId, initialData) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error('Container not found');
        
        this.svgElement = this.container.querySelector('svg');
        if (!this.svgElement) throw new Error('SVG element not found');
        
        this.mode = 'add-node';
        this.selectedNode = null;
        this.nodeData = initialData?.nodes || {};
        this.edgeData = initialData?.edges || {};
        this.nodeElements = {};
        this.edgeElements = {};
        this.activeEventListeners = [];

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
            const width = parseInt(this.svgElement.getAttribute('width')) || 1000;
            const height = parseInt(this.svgElement.getAttribute('height')) || 800;
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
    }

    setupControls() {
        const controls = [
            { id: 'add-node', mode: 'add-node' },
            { id: 'add-edge', mode: 'add-edge' },
            { id: 'delete-mode', mode: 'delete' },
            { id: 'zoom-in', action: () => this.zoom(1.2) },
            { id: 'zoom-out', action: () => this.zoom(0.8) },
            { id: 'fit-view', action: () => this.fitView() },
            { id: 'update-node', action: () => this.updateNodeProperties() },
            { id: 'delete-node', action: () => this.deleteSelectedNode() },
            { id: 'save-map', action: () => this.saveMap() },
            { id: 'reset-map', action: () => this.resetMap() }
        ];

        controls.forEach(control => {
            const element = document.getElementById(control.id);
            if (!element) return;

            const handler = control.action || (() => this.setMode(control.mode));
            element.addEventListener('click', handler);
            this.activeEventListeners.push({ element, event: 'click', handler });
        });
    }

    setMode(mode) {
        this.mode = mode;
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${mode}-mode`);
        });
        this.clearSelection();
    }

    clearSelection() {
        if (this.selectedNode) {
            this.nodeElements[this.selectedNode]?.classList?.remove('selected');
            this.selectedNode = null;
            this.updateSelectionDisplay();
        }
    }

    setupEventListeners() {
        const svgEvents = [
            { event: 'click', handler: this.handleSvgClick.bind(this) },
            { event: 'mousedown', handler: this.handleSvgMouseDown.bind(this) },
            { event: 'mousemove', handler: this.throttle(this.handleSvgMouseMove.bind(this), 16) }
        ];

        svgEvents.forEach(({ event, handler }) => {
            this.svgElement.addEventListener(event, handler);
            this.activeEventListeners.push({ element: this.svgElement, event, handler });
        });
    }

    handleSvgClick(e) {
        try {
            const point = this.getSVGPoint(e);
            switch(this.mode) {
                case 'add-node': this.addNode(point.x, point.y); break;
                case 'add-edge': this.handleEdgeCreation(e); break;
                case 'delete': this.handleDeletion(e.target); break;
            }
        } catch (error) {
            console.error('Click handler error:', error);
        }
    }

    handleSvgMouseDown(e) {
        if (e.target.classList.contains('node')) {
            e.preventDefault();
        }
    }

    handleSvgMouseMove(e) {
        if (e.buttons === 1 && this.selectedNode) {
            const point = this.getSVGPoint(e);
            this.moveNode(this.selectedNode, point.x, point.y);
        }
    }

    throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) return;
            lastCall = now;
            return fn(...args);
        };
    }

    getSVGPoint(event) {
        try {
            const pt = this.svgElement.createSVGPoint();
            pt.x = event.clientX;
            pt.y = event.clientY;
            return pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
        } catch (error) {
            console.error('Failed to get SVG point:', error);
            return { x: 0, y: 0 };
        }
    }

    addNode(x, y) {
        const nodeId = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.nodeData[nodeId] = {
            name: `Node ${Object.keys(this.nodeData).length + 1}`,
            type: 'room',
            x: Math.round(x),
            y: Math.round(y),
            meta: {}
        };
        this.createNodeElement(nodeId);
        this.selectNode(nodeId);
    }

    createNodeElement(nodeId) {
        const node = this.nodeData[nodeId];
        if (!node) return null;

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
        text.textContent = this.getNodeLabel(nodeId);

        group.appendChild(circle);
        group.appendChild(text);
        this.svgElement.appendChild(group);
        this.nodeElements[nodeId] = group;

        return group;
    }

    getNodeLabel(nodeId) {
        return nodeId.split('_')[1].slice(0, 3); // First 3 chars of timestamp
    }

    getNodeColor(type) {
        const colors = {
            'room': '#6a0dad',
            'staircase': '#2196F3',
            'entrance': '#4CAF50',
            'landmark': '#FF9800',
            'elevator': '#FF5722'
        };
        return colors[type?.toLowerCase()] || '#9E9E9E';
    }

    selectNode(nodeId) {
        if (!nodeId || !this.nodeData[nodeId]) return;
        
        this.clearSelection();
        this.selectedNode = nodeId;
        this.nodeElements[nodeId]?.classList?.add('selected');
        this.updatePropertiesPanel();
    }

    updatePropertiesPanel() {
        if (!this.selectedNode) {
            document.getElementById('selected-node').textContent = 'None';
            return;
        }

        const node = this.nodeData[this.selectedNode];
        if (!node) return;

        document.getElementById('node-id').value = this.selectedNode;
        document.getElementById('node-name').value = this.sanitizeInput(node.name);
        document.getElementById('node-type').value = this.sanitizeInput(node.type);
        document.getElementById('selected-node').textContent = 
            `${this.sanitizeOutput(node.name)} (${this.selectedNode})`;
    }

    sanitizeInput(str) {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    sanitizeOutput(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    updateNodeProperties() {
        if (!this.selectedNode) return;

        const node = this.nodeData[this.selectedNode];
        if (!node) return;

        const nameInput = document.getElementById('node-name');
        const typeInput = document.getElementById('node-type');

        if (nameInput && typeInput) {
            node.name = this.sanitizeInput(nameInput.value);
            node.type = this.sanitizeInput(typeInput.value);

            const group = this.nodeElements[this.selectedNode];
            if (group) {
                const circle = group.querySelector('circle');
                if (circle) circle.setAttribute('fill', this.getNodeColor(node.type));
                
                const text = group.querySelector('text');
                if (text) text.textContent = this.getNodeLabel(this.selectedNode);
            }
        }
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return;

        // Remove from data
        delete this.nodeData[this.selectedNode];

        // Remove connected edges
        Object.keys(this.edgeData).forEach(sourceId => {
            if (sourceId === this.selectedNode) {
                delete this.edgeData[sourceId];
            } else {
                this.edgeData[sourceId] = (this.edgeData[sourceId] || []).filter(
                    targetId => targetId !== this.selectedNode
                );
            }
        });

        // Remove visual elements
        if (this.nodeElements[this.selectedNode]) {
            this.svgElement.removeChild(this.nodeElements[this.selectedNode]);
            delete this.nodeElements[this.selectedNode];
        }

        this.updateEdgeVisuals();
        this.clearSelection();
    }

    handleEdgeCreation(event) {
        const clickedElement = event.target.closest('.node');
        if (!clickedElement) return;

        const nodeId = clickedElement.getAttribute('data-node-id');
        if (!nodeId || !this.nodeData[nodeId]) return;

        if (!this.selectedNode) {
            this.selectNode(nodeId);
        } else if (this.selectedNode !== nodeId) {
            this.addEdge(this.selectedNode, nodeId);
            this.selectNode(nodeId);
        }
    }

    addEdge(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) return;
        if (!this.nodeData[sourceId] || !this.nodeData[targetId]) return;

        this.edgeData[sourceId] = this.edgeData[sourceId] || [];
        
        if (!this.edgeData[sourceId].includes(targetId)) {
            this.edgeData[sourceId].push(targetId);
            this.updateEdgeVisuals();
        }
    }

    updateEdgeVisuals() {
        // Remove only affected edges for better performance
        const edgesToKeep = new Set();
        
        Object.entries(this.edgeData).forEach(([sourceId, targetIds]) => {
            if (!this.nodeData[sourceId]) return;

            targetIds.forEach(targetId => {
                if (!this.nodeData[targetId]) return;

                const edgeId = `${sourceId}-${targetId}`;
                const reverseEdgeId = `${targetId}-${sourceId}`;
                edgesToKeep.add(edgeId);

                if (!this.edgeElements[edgeId] && !this.edgeElements[reverseEdgeId]) {
                    this.createEdgeElement(sourceId, targetId, edgeId);
                }
            });
        });

        // Remove orphaned edges
        Object.keys(this.edgeElements).forEach(edgeId => {
            if (!edgesToKeep.has(edgeId)) {
                const edge = this.edgeElements[edgeId];
                if (edge?.parentNode) edge.parentNode.removeChild(edge);
                delete this.edgeElements[edgeId];
            }
        });
    }

    createEdgeElement(sourceId, targetId, edgeId) {
        const source = this.nodeData[sourceId];
        const target = this.nodeData[targetId];
        if (!source || !target) return;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", source.x);
        line.setAttribute("y1", source.y);
        line.setAttribute("x2", target.x);
        line.setAttribute("y2", target.y);
        line.setAttribute("class", "edge");
        line.setAttribute("data-edge-id", edgeId);
        line.setAttribute("data-source", sourceId);
        line.setAttribute("data-target", targetId);

        this.svgElement.appendChild(line);
        this.edgeElements[edgeId] = line;
    }

    handleDeletion(element) {
        const node = element.closest('.node');
        const edge = element.closest('.edge');

        if (node) {
            const nodeId = node.getAttribute('data-node-id');
            if (nodeId && this.nodeData[nodeId]) {
                this.selectNode(nodeId);
                this.deleteSelectedNode();
            }
        } else if (edge) {
            this.deleteEdge(edge);
        }
    }

    deleteEdge(edgeElement) {
        const edgeId = edgeElement.getAttribute('data-edge-id');
        const sourceId = edgeElement.getAttribute('data-source');
        
        if (sourceId && this.edgeData[sourceId]) {
            const targetId = edgeElement.getAttribute('data-target');
            this.edgeData[sourceId] = this.edgeData[sourceId].filter(id => id !== targetId);
        }

        if (edgeElement.parentNode) {
            edgeElement.parentNode.removeChild(edgeElement);
        }
        delete this.edgeElements[edgeId];
    }

    moveNode(nodeId, x, y) {
        const node = this.nodeData[nodeId];
        if (!node) return;

        node.x = Math.round(x);
        node.y = Math.round(y);

        const group = this.nodeElements[nodeId];
        if (group) {
            group.setAttribute('transform', `translate(0, 0)`); // Reset before updating
            const circle = group.querySelector('circle');
            const text = group.querySelector('text');
            
            if (circle) {
                circle.setAttribute('cx', node.x);
                circle.setAttribute('cy', node.y);
            }
            
            if (text) {
                text.setAttribute('x', node.x);
                text.setAttribute('y', node.y + 5);
            }
        }

        this.updateConnectedEdges(nodeId);
    }

    updateConnectedEdges(nodeId) {
        // Update edges where this node is source
        if (this.edgeData[nodeId]) {
            this.edgeData[nodeId].forEach(targetId => {
                const edgeId = `${nodeId}-${targetId}`;
                this.updateEdgePosition(edgeId);
            });
        }

        // Update edges where this node is target
        Object.entries(this.edgeData).forEach(([sourceId, targetIds]) => {
            if (targetIds.includes(nodeId)) {
                const edgeId = `${sourceId}-${nodeId}`;
                this.updateEdgePosition(edgeId);
            }
        });
    }

    updateEdgePosition(edgeId) {
        const edge = this.edgeElements[edgeId];
        if (!edge) return;

        const sourceId = edge.getAttribute('data-source');
        const targetId = edge.getAttribute('data-target');
        const source = this.nodeData[sourceId];
        const target = this.nodeData[targetId];

        if (source && target) {
            edge.setAttribute('x1', source.x);
            edge.setAttribute('y1', source.y);
            edge.setAttribute('x2', target.x);
            edge.setAttribute('y2', target.y);
        }
    }

    zoom(factor) {
        try {
            const viewBox = this.svgElement.getAttribute('viewBox').split(/\s+/).map(Number);
            if (viewBox.length !== 4) return;

            const newWidth = viewBox[2] / factor;
            const newHeight = viewBox[3] / factor;
            const newX = viewBox[0] + (viewBox[2] - newWidth) / 2;
            const newY = viewBox[1] + (viewBox[3] - newHeight) / 2;

            this.svgElement.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
        } catch (error) {
            console.error('Zoom error:', error);
        }
    }

    fitView() {
        const width = parseInt(this.svgElement.getAttribute('width')) || 1000;
        const height = parseInt(this.svgElement.getAttribute('height')) || 800;
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
        const mapName = mapData?.type === 'building' 
            ? `${mapData.name}_floor${currentFloor}` 
            : mapData?.name || 'unknown';

        const payload = {
            map: mapName,
            nodes: this.nodeData,
            edges: this.edgeData,
            timestamp: new Date().toISOString()
        };

        fetch('/admin/api/save_map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Save failed');
            return data;
        })
        .then(data => {
            alert(`Map saved successfully! ${data.message || ''}`);
        })
        .catch(error => {
            console.error('Save error:', error);
            alert(`Save failed: ${error.message}`);
        });
    }

    resetMap() {
        if (confirm('Discard all unsaved changes?')) {
            const url = new URL(window.location.href);
            const floorSelect = document.getElementById('floor-select');
            if (floorSelect) url.searchParams.set('floor', floorSelect.value);
            window.location.href = url.toString();
        }
    }

    destroy() {
        // Clean up event listeners
        this.activeEventListeners.forEach(({ element, event, handler }) => {
            element?.removeEventListener?.(event, handler);
        });
        this.activeEventListeners = [];
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (document.getElementById('svg-editor')) {
            window.editor = new SVGEditor('svg-editor', window.mapData || {});
        }
    } catch (error) {
        console.error('Editor initialization failed:', error);
        alert('Failed to initialize editor. Please check console for details.');
    }
});
