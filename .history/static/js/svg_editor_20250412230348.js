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
        this.dragState = null;
        
        this.init();
    }

    init() {
        // Set up viewBox if not present
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
        // Set up tool buttons
        document.getElementById('add-node').addEventListener('click', () => this.setMode('add-node'));
        document.getElementById('add-edge').addEventListener('click', () => this.setMode('add-edge'));
        document.getElementById('delete-mode').addEventListener('click', () => this.setMode('delete'));
        
        // Set up view controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('fit-view').addEventListener('click', () => this.fitView());
        
        // Set up save/reset
        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('reset-map').addEventListener('click', () => this.resetMap());
    }

    setMode(mode) {
        this.mode = mode;
        
        // Update UI
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        // Clear temporary states
        if (this.tempEdge) {
            this.svgElement.removeChild(this.tempEdge);
            this.tempEdge = null;
        }
        
        if (this.selectedNode && mode !== 'add-edge') {
            this.deselectNode();
        }
    }

    setupEventListeners() {
        this.svgElement.addEventListener('click', this.handleClick.bind(this));
        this.svgElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svgElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svgElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svgElement.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteSelectedNode();
            }
        });
    }

    handleClick(e) {
        const point = this.getSVGPoint(e);
        
        switch(this.mode) {
            case 'add-node':
                this.addNode(point.x, point.y);
                break;
                
            case 'add-edge':
                this.handleEdgeClick(e);
                break;
                
            case 'delete':
                this.handleDeletion(e.target);
                break;
        }
    }

    handleMouseDown(e) {
        if (e.target.classList.contains('node')) {
            e.preventDefault();
            const nodeId = e.target.closest('.node').getAttribute('data-node-id');
            
            if (this.mode !== 'add-edge') {
                this.selectNode(nodeId);
            }
            
            this.dragState = {
                nodeId: nodeId,
                startX: e.clientX,
                startY: e.clientY,
                originalX: this.nodeData[nodeId].x,
                originalY: this.nodeData[nodeId].y
            };
        }
    }

    handleMouseMove(e) {
        if (this.dragState && e.buttons === 1) {
            const dx = e.clientX - this.dragState.startX;
            const dy = e.clientY - this.dragState.startY;
            const node = this.nodeData[this.dragState.nodeId];
            
            // Convert screen pixels to SVG units
            const pt = this.svgElement.createSVGPoint();
            pt.x = dx;
            pt.y = dy;
            const transformed = pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
            
            node.x = Math.round(this.dragState.originalX + transformed.x);
            node.y = Math.round(this.dragState.originalY + transformed.y);
            
            this.updateNodePosition(this.dragState.nodeId);
            this.updateEdgeVisuals();
        }
    }

    handleMouseUp() {
        this.dragState = null;
    }

    getSVGPoint(event) {
        const pt = this.svgElement.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        return pt.matrixTransform(this.svgElement.getScreenCTM().inverse());
    }

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
        text.textContent = node.name.substring(0, 3);

        group.appendChild(circle);
        group.appendChild(text);
        this.svgElement.appendChild(group);

        this.nodeElements[nodeId] = group;
        return group;
    }

    getNodeColor(type) {
        const colors = {
            'room': '#6a0dad',
            'staircase': '#2196F3',
            'elevator': '#FF5722',
            'entrance': '#4CAF50',
            'landmark': '#FF9800'
        };
        return colors[type] || '#9E9E9E';
    }

    selectNode(nodeId) {
        if (this.selectedNode) {
            this.deselectNode();
        }
        
        this.selectedNode = nodeId;
        this.nodeElements[nodeId].classList.add('selected');
    }

    deselectNode() {
        if (this.selectedNode && this.nodeElements[this.selectedNode]) {
            this.nodeElements[this.selectedNode].classList.remove('selected');
        }
        this.selectedNode = null;
    }

    updateNodePosition(nodeId) {
        const node = this.nodeData[nodeId];
        const group = this.nodeElements[nodeId];
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    }

    handleEdgeClick(e) {
        const nodeElement = e.target.closest('.node');
        if (!nodeElement) return;
        
        const nodeId = nodeElement.getAttribute('data-node-id');
        
        if (!this.selectedNode) {
            this.selectNode(nodeId);
        } else if (this.selectedNode !== nodeId) {
            this.addEdge(this.selectedNode, nodeId);
            this.selectNode(nodeId);
        }
    }

    addEdge(sourceId, targetId) {
        if (!this.edgeData[sourceId]) {
            this.edgeData[sourceId] = [];
        }
        
        if (!this.edgeData[sourceId].includes(targetId)) {
            this.edgeData[sourceId].push(targetId);
            this.updateEdgeVisuals();
        }
    }

    updateEdgeVisuals() {
        // Remove all existing edges
        Object.values(this.edgeElements).forEach(edge => {
            if (edge.parentNode) {
                edge.parentNode.removeChild(edge);
            }
        });
        this.edgeElements = {};
        
        // Draw new edges
        Object.entries(this.edgeData).forEach(([sourceId, targetIds]) => {
            if (!this.nodeData[sourceId]) return;
            
            targetIds.forEach(targetId => {
                if (!this.nodeData[targetId]) return;
                
                const edgeId = `${sourceId}-${targetId}`;
                const reverseEdgeId = `${targetId}-${sourceId}`;
                
                // Skip duplicates (undirected graph)
                if (this.edgeElements[edgeId] || this.edgeElements[reverseEdgeId]) return;
                
                const source = this.nodeData[sourceId];
                const target = this.nodeData[targetId];
                
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", source.x);
                line.setAttribute("y1", source.y);
                line.setAttribute("x2", target.x);
                line.setAttribute("y2", target.y);
                line.setAttribute("stroke", "#555");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("class", "edge");
                line.setAttribute("data-edge-id", edgeId);
                
                this.svgElement.appendChild(line);
                this.edgeElements[edgeId] = line;
            });
        });
    }

    handleDeletion(element) {
        const node = element.closest('.node');
        const edge = element.closest('.edge');
        
        if (node) {
            const nodeId = node.getAttribute('data-node-id');
            this.deleteNode(nodeId);
        } else if (edge) {
            const edgeId = edge.getAttribute('data-edge-id');
            this.deleteEdge(edgeId);
        }
    }

    deleteNode(nodeId) {
        // Remove from data
        delete this.nodeData[nodeId];
        
        // Remove connected edges
        Object.keys(this.edgeData).forEach(sourceId => {
            if (sourceId === nodeId) {
                delete this.edgeData[sourceId];
            } else {
                this.edgeData[sourceId] = this.edgeData[sourceId].filter(
                    targetId => targetId !== nodeId
                );
            }
        });
        
        // Remove visual elements
        if (this.nodeElements[nodeId]) {
            this.svgElement.removeChild(this.nodeElements[nodeId]);
            delete this.nodeElements[nodeId];
        }
        
        this.updateEdgeVisuals();
        
        if (this.selectedNode === nodeId) {
            this.deselectNode();
        }
    }

    deleteEdge(edgeId) {
        const [sourceId, targetId] = edgeId.split('-');
        
        if (this.edgeData[sourceId]) {
            this.edgeData[sourceId] = this.edgeData[sourceId].filter(
                id => id !== targetId
            );
            
            if (this.edgeElements[edgeId]) {
                this.svgElement.removeChild(this.edgeElements[edgeId]);
                delete this.edgeElements[edgeId];
            }
        }
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
        const width = this.svgElement.getAttribute('width') || '1000';
        const height = this.svgElement.getAttribute('height') || '800';
        this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    loadExistingData() {
        // Create nodes
        Object.keys(this.nodeData).forEach(nodeId => {
            this.createNodeElement(nodeId);
        });
        
        // Create edges
        this.updateEdgeVisuals();
    }

    saveMap() {
        const currentFloor = document.getElementById('floor-select')?.value || '1';
        const mapName = `building_${currentFloor}`;
        
        fetch('/admin/api/save_map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                map: mapName,
                nodes: this.nodeData,
                edges: this.edgeData
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Map saved successfully!');
            } else {
                throw new Error(data.error || 'Save failed');
            }
        })
        .catch(error => {
            console.error('Save error:', error);
            alert(`Error saving map: ${error.message}`);
        });
    }

    resetMap() {
        if (confirm('Are you sure you want to reset all changes on this floor?')) {
            window.location.reload();
        }
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('svg-editor')) {
        window.editor = new SVGEditor('svg-editor', window.mapData || {
            nodes: {},
            edges: {}
        });
    }
});