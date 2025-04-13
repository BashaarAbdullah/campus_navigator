document.addEventListener('DOMContentLoaded', function() {
    // Access the global pathfinder data
    const { campusNodes = [], buildings = [] } = window.pathfinderData || {};
    console.log('Available campus nodes:', campusNodes);
    console.log('Available buildings:', buildings);

    // DOM element references
    const currentLocationSelect = document.getElementById('current-location');
    const destinationSelect = document.getElementById('destination');
    const findPathBtn = document.getElementById('find-path');
    const resetPathBtn = document.getElementById('reset-path');
    const waypointMap = document.getElementById('waypoint-map');
    const pathResults = document.getElementById('path-results');
    const directionsList = document.getElementById('directions');
    const totalDistanceSpan = document.getElementById('total-distance');
    const estimatedTimeSpan = document.getElementById('estimated-time');
    
    let currentPath = null;
    
    // Enable/disable find path button based on selections
    function updateFindPathButton() {
        const hasSelection = currentLocationSelect.value && destinationSelect.value;
        findPathBtn.disabled = !hasSelection;
    }
    
    // Initialize map interactivity
    function setupMapInteractivity() {
        const svg = waypointMap.querySelector('svg');
        if (!svg) return;
        
        const clickableElements = svg.querySelectorAll('[data-node-id]');
        clickableElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', function() {
                const nodeId = this.getAttribute('data-node-id');
                
                if (!currentLocationSelect.value) {
                    currentLocationSelect.value = nodeId;
                } else if (!destinationSelect.value) {
                    destinationSelect.value = nodeId;
                }
                
                updateFindPathButton();
            });
        });
    }

    // Reset button handler
    resetPathBtn.addEventListener('click', function() {
        currentLocationSelect.value = '';
        destinationSelect.value = '';
        findPathBtn.disabled = true;
        pathResults.style.display = 'none';
        waypointMap.querySelectorAll('.path-highlight').forEach(el => el.remove());
    });
    
    // Find path button handler
    findPathBtn.addEventListener('click', function() {
        const start = currentLocationSelect.value;
        const end = destinationSelect.value;
        
        if (!start || !end) return;
        
        findPathBtn.disabled = true;
        findPathBtn.textContent = 'Finding Path...';
        
        setTimeout(() => {
            const path = findPath(start, end);
            displayPath(path);
            findPathBtn.disabled = false;
            findPathBtn.textContent = 'Find Path';
        }, 500);
    });
    
    // Pathfinding function
    function findPath(start, end) {
        console.log(`Finding path from ${start} to ${end}`);
        
        // Mock responses
        if (start === 'main_gate' && end === 'library') {
            return {
                path: ['main_gate', 'library'],
                distance: 150,
                nodes: [
                    {name: 'Main Gate', x: 100, y: 300},
                    {name: 'Library', x: 250, y: 200}
                ]
            };
        } else if (start === 'building_A_entrance' && end === 'A101') {
            return {
                path: ['building_A_entrance', 'A_stairs_1', 'A101'],
                distance: 130,
                nodes: [
                    {name: 'Building A Entrance', x: 50, y: 300},
                    {name: 'Staircase 1', x: 200, y: 350},
                    {name: 'Room A101', x: 150, y: 200}
                ]
            };
        }
        
        // Default response using actual campusNodes data
        return {
            path: [start, end],
            distance: 100,
            nodes: [
                campusNodes.find(n => n.id === start) || {name: start, x: 100, y: 100},
                campusNodes.find(n => n.id === end) || {name: end, x: 200, y: 200}
            ]
        };
    }
    
    // Display the calculated path
    function displayPath(path) {
        if (!path) {
            alert('No path found between the selected locations');
            return;
        }
        
        directionsList.innerHTML = '';
        path.nodes.forEach((node, index) => {
            const step = document.createElement('div');
            step.className = 'direction-step';
            
            const icon = document.createElement('div');
            icon.className = 'step-icon';
            icon.textContent = index + 1;
            
            const content = document.createElement('div');
            content.className = 'step-content';
            content.textContent = node.name;
            
            if (index < path.nodes.length - 1) {
                const nextNode = path.nodes[index + 1];
                const distance = Math.round(getDistance(node, nextNode));
                content.textContent += ` → Walk ${distance}m to ${nextNode.name}`;
            }
            
            step.appendChild(icon);
            step.appendChild(content);
            directionsList.appendChild(step);
        });
        
        totalDistanceSpan.textContent = Math.round(path.distance);
        estimatedTimeSpan.textContent = Math.round(path.distance / 80);
        pathResults.style.display = 'block';
        highlightPathOnMap(path);
    }
    
    // Calculate distance between two nodes
    function getDistance(node1, node2) {
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Visual path highlighting
    function highlightPathOnMap(path) {
        waypointMap.querySelectorAll('.path-highlight').forEach(el => el.remove());
        
        const svg = waypointMap.querySelector('svg');
        if (!svg) return;
        
        for (let i = 0; i < path.nodes.length - 1; i++) {
            const node1 = path.nodes[i];
            const node2 = path.nodes[i + 1];
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", node1.x);
            line.setAttribute("y1", node1.y);
            line.setAttribute("x2", node2.x);
            line.setAttribute("y2", node2.y);
            line.setAttribute("class", "path-highlight");
            line.setAttribute("stroke", "#ff5722");
            line.setAttribute("stroke-width", "4");
            line.setAttribute("stroke-dasharray", "5,5");
            
            svg.appendChild(line);
        }
    }

    // Initialize event listeners and map
    currentLocationSelect.addEventListener('change', updateFindPathButton);
    destinationSelect.addEventListener('change', updateFindPathButton);
    setupMapInteractivity();
    updateFindPathButton();
});