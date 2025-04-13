class SVGEditor {
    constructor(containerId, initialData) {
        this.container = document.getElementById(containerId);
        this.svgElement = this.container.querySelector('svg');
        this.mode = 'add-node'; // 'add-node', 'add-edge', 'delete'
        this.selectedNode = null;
        this.tempEdge = null;
        this.nodeData = initialData.nodes || {};
        this.edgeData = initialData.edges || {};
        this.nodeElements = {};
        this.edgeElements = {};
        
        this.init();
    }
    
    init() {
        // Set SVG viewBox if not set
        if (!this.svgElement.hasAttribute('viewBox') && 
            this.svgElement.hasAttribute('width') && 
            this.svgElement.hasAttribute('height')) {
            const width = this.svgElement.getAttribute('width');
            const height = this.svgElement.getAttribute('height');
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        
        // Add editor controls
        this.setupControls();
        
        // Initialize existing nodes and edges
        this.loadExistingData();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupControls() {
        // Tool buttons
        document.getElementById('add-node').addEventListener('click', () => this.setMode('add-node'));
        document.getElementById('add-edge').addEventListener('click', () => this.setMode('add-edge'));
        document.getElementById('delete-mode').addEventListener('click', () => this.setMode('delete'));
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('fit-view').addEventListener('click', () => this.fitView());
        
        // Node property controls
        document.getElementById('update-node').addEventListener('click', () => this.updateNodeProperties());
        document.getElementById('delete-node').addEventListener('click', () => this.deleteSelectedNode());
        
        // Save button
        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('reset-map').addEventListener('click', () => this.resetMap());
    }
    
    setMode(mode) {
        this.mode = mode;
        
        // Update UI
        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        // Clear any temporary states
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
                    this.handleEdgeCreation(point);
                    break;
                case 'delete':
                    this.handleDeletion(e.target);
                    break;
            }
        });
        
        // Prevent default drag behavior
        this.svgElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node')) {
                e.preventDefault();
            }
        });
        
        // Node dragging
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
        
        // Create group
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "node");
        group.setAttribute("data-node-id", nodeId);
        
        // Create circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "10");
        circle.setAttribute("fill", this.getNodeColor(node.type));
        
        // Create text
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "white");
        text.textContent = nodeId.substring(5); // Show shortened ID
        
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
            'entrance': '#4CAF50',
            'landmark': '#FF9800'
        };
        return colors[type] || '#9c27b0';
    }
    
    selectNode(nodeId) {
        // Deselect previous
        if (this.selectedNode) {
            this.nodeElements[this.selectedNode].classList.remove('selected');
        }
        
        this.selectedNode = nodeId;
        this.nodeElements[nodeId].classList.add('selected');
        
        // Update properties panel
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
        if (this.selectedNode) {
            display.textContent = `${this.nodeData[this.selectedNode].name} (${this.selectedNode})`;
        } else {
            display.textContent = 'None';
        }
    }
    
    updateNodeProperties() {
        if (!this.selectedNode) return;
        
        const node = this.nodeData[this.selectedNode];
        node.name = document.getElementById('node-name').value;
        node.type = document.getElementById('node-type').value;
        
        // Update visual
        const group = this.nodeElements[this.selectedNode];
        group.querySelector('circle').setAttribute('fill', this.getNodeColor(node.type));
        group.querySelector('text').textContent = this.selectedNode.substring(5);
    }
    
    deleteSelectedNode() {
        if (!this.selectedNode) return;
        
        // Remove from data
        delete this.nodeData[this.selectedNode];
        
        // Remove any edges connected to this node
        Object.keys(this.edgeData).forEach(sourceId => {
            if (sourceId === this.selectedNode) {
                delete this.edgeData[sourceId];
            } else {
                this.edgeData[sourceId] = this.edgeData[sourceId].filter(
                    targetId => targetId !== this.selectedNode
                );
            }
        });
        
        // Remove visual elements
        this.svgElement.removeChild(this.nodeElements[this.selectedNode]);
        delete this.nodeElements[this.selectedNode];
        
        // Remove any edge visuals
        this.updateEdgeVisuals();
        
        this.selectedNode = null;
        this.updateSelectionDisplay();
    }
    
    handleEdgeCreation(point) {
        // Find if clicked on a node
        const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
        const nodeGroup = clickedElement.closest('.node');
        
        if (nodeGroup) {
            const nodeId = nodeGroup.getAttribute('data-node-id');
            
            if (!this.selectedNode) {
                // First node selection
                this.selectNode(nodeId);
            } else if (this.selectedNode !== nodeId) {
                // Create edge between selectedNode and this node
                this.addEdge(this.selectedNode, nodeId);
                this.selectNode(nodeId);
            }
        }
    }
    
    addEdge(sourceId, targetId) {
        // Initialize if not exists
        if (!this.edgeData[sourceId]) {
            this.edgeData[sourceId] = [];
        }
        
        // Add if not already connected
        if (!this.edgeData[sourceId].includes(targetId)) {
            this.edgeData[sourceId].push(targetId);
            this.updateEdgeVisuals();
        }
    }
    
    updateEdgeVisuals() {
        // Remove all existing edge visuals
        Object.values(this.edgeElements).forEach(edge => {
            if (edge.parentNode) {
                edge.parentNode.removeChild(edge);
            }
        });
        this.edgeElements = {};
        
        // Redraw all edges
        Object.entries(this.edgeData).forEach(([sourceId, targetIds]) => {
            if (!this.nodeData[sourceId]) return;
            
            targetIds.forEach(targetId => {
                if (!this.nodeData[targetId]) return;
                
                const edgeId = `${sourceId}-${targetId}`;
                const reverseEdgeId = `${targetId}-${sourceId}`;
                
                // Skip if already drawn (undirected graph)
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
            this.deleteSelectedNode();
        } else if (edgeElement) {
            const edgeId = edgeElement.getAttribute('data-edge-id');
            const [sourceId, targetId] = edgeId.split('-');
            
            // Remove edge from data
            if (this.edgeData[sourceId]) {
                this.edgeData[sourceId] = this.edgeData[sourceId].filter(id => id !== targetId);
            }
            
            // Remove visual
            this.svgElement.removeChild(edgeElement);
            delete this.edgeElements[edgeId];
        }
    }
    
    moveNode(nodeId, x, y) {
        const node = this.nodeData[nodeId];
        node.x = Math.round(x);
        node.y = Math.round(y);
        
        // Update visual
        const group = this.nodeElements[nodeId];
        group.setAttribute('transform', `translate(${x - node.x}, ${y - node.y})`);
        
        // Update edge visuals
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
        // Simple implementation - reset to original viewBox
        const width = this.svgElement.getAttribute('width');
        const height = this.svgElement.getAttribute('height');
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
        // In a real app, this would send data to the server
        console.log('Saving map data:', {
            nodes: this.nodeData,
            edges: this.edgeData
        });
        
        // Simulate API call
        fetch('/api/save_map', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                map: mapData.name,
                nodes: this.nodeData,
                edges: this.edgeData
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Map saved successfully!');
        })
        .catch(error => {
            console.error('Error saving map:', error);
            alert('Error saving map. Please try again.');
        });
    }
    
    resetMap() {
        if (confirm('Are you sure you want to reset all changes?')) {
            // Reload the page
            window.location.reload();
        }
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('svg-editor')) {
        window.editor = new SVGEditor('svg-editor', mapData);
    }
});