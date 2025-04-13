document.addEventListener('DOMContentLoaded', function() {
    const campusViewBtn = document.getElementById('campus-view');
    const buildingViewBtn = document.getElementById('building-view');
    const buildingSelection = document.getElementById('building-selection');
    const buildingSelect = document.getElementById('building-select');
    const floorSelect = document.getElementById('floor-select');
    const campusMap = document.getElementById('campus-map');
    const buildingMaps = document.getElementById('building-maps');
    
    // View toggle
    campusViewBtn.addEventListener('click', function() {
        campusViewBtn.classList.add('active');
        buildingViewBtn.classList.remove('active');
        buildingSelection.style.display = 'none';
        campusMap.style.display = 'block';
        buildingMaps.style.display = 'none';
    });
    
    buildingViewBtn.addEventListener('click', function() {
        buildingViewBtn.classList.add('active');
        campusViewBtn.classList.remove('active');
        buildingSelection.style.display = 'flex';
        campusMap.style.display = 'none';
        buildingMaps.style.display = 'block';
    });
    
    // Building selection
    buildingSelect.addEventListener('change', function() {
        if (this.value) {
            floorSelect.disabled = false;
            // Update floor options based on building
            updateFloorOptions(this.value);
        } else {
            floorSelect.disabled = true;
            floorSelect.innerHTML = '<option value="">Select Floor</option>';
        }
    });
    
    // Floor selection
    floorSelect.addEventListener('change', function() {
        if (this.value && buildingSelect.value) {
            loadBuildingMap(buildingSelect.value, this.value);
        }
    });
    
    function updateFloorOptions(building) {
        // Normally this would come from an API, but we'll hardcode for demo
        let floors = [];
        
        switch(building) {
            case 'A':
            case 'B':
            case 'C':
                floors = [1, 2, 3, 4];
                break;
            case 'AD':
                floors = [1, 2];
                break;
        }
        
        floorSelect.innerHTML = '<option value="">Select Floor</option>';
        floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor;
            option.textContent = `Floor ${floor}`;
            floorSelect.appendChild(option);
        });
    }
    
    function loadBuildingMap(building, floor) {
        // In a real app, this would fetch the SVG via AJAX
        const mapUrl = `/maps/building_${building}_floor${floor}.svg`;
        
        fetch(mapUrl)
            .then(response => response.text())
            .then(svg => {
                buildingMaps.innerHTML = svg;
                
                // Add interactivity to the SVG if needed
                const svgElement = buildingMaps.querySelector('svg');
                if (svgElement) {
                    svgElement.style.width = '100%';
                    svgElement.style.height = '100%';
                }
            })
            .catch(error => {
                console.error('Error loading map:', error);
                buildingMaps.innerHTML = `<div class="error">Error loading map. Please try again.</div>`;
            });
    }
    
    // Initialize with campus view
    campusViewBtn.click();
});