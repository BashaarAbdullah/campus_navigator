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
        this.init();
    }

    init() {
        if (!this.svgElement.hasAttribute('viewBox')) {
            const width = this.svgElement.getAttribute('width') || '1000';
            const height = this.svgElement.getAttribute('height') || '800';
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        this.setupControls();
        this.loadExistingData();
        this.setupEventListeners();
    }

    saveMap() {
        const currentFloor = document.getElementById('floor-select')?.value || '1';
        const mapName = mapData.type === 'building' 
            ? `${mapData.name}_floor${currentFloor}` 
            : mapData.name;

        fetch('/admin/api/save_map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                map: mapName,
                nodes: this.nodeData,
                edges: this.edgeData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Map saved successfully!');
            } else {
                throw new Error(data.error || 'Failed to save');
            }
        })
        .catch(error => {
            console.error('Save error:', error);
            alert(`Save failed: ${error.message}`);
        });
    }

    // ... (rest of the SVGEditor methods remain unchanged) ...
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('svg-editor')) {
        window.editor = new SVGEditor('svg-editor', mapData);
    }
});