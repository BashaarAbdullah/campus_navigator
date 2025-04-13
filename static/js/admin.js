document.addEventListener('DOMContentLoaded', function() {
    // General admin page functionality
    
    // Confirm before destructive actions
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
    
    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', function() {
        fetch('/admin/logout', {
            method: 'POST'
        }).then(() => {
            window.location.href = '/';
        });
    });
});

// ✅ Function to save map data to backend
function saveMapData(mapName, nodes, edges) {
    fetch('/admin/save_map_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `map_name=${encodeURIComponent(mapName)}&nodes=${encodeURIComponent(JSON.stringify(nodes))}&edges=${encodeURIComponent(JSON.stringify(edges))}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error saving: ' + data.error);
        } else {
            alert('Map saved successfully!');
        }
    });
}
