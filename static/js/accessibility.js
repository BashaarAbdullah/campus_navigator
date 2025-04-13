document.addEventListener('DOMContentLoaded', function() {
    // Skip to content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add aria-labels to icons
    document.querySelectorAll('.fas').forEach(icon => {
        if (!icon.getAttribute('aria-label') && !icon.closest('[aria-label], [aria-labelledby]')) {
            const label = icon.className.replace('fas fa-', '').replace(/-/g, ' ');
            icon.setAttribute('aria-label', label);
        }
    });
    
    // Trap focus in modals
    document.addEventListener('focus', function(e) {
        const modal = document.querySelector('.modal-overlay');
        if (modal && !modal.contains(e.target)) {
            e.stopPropagation();
            modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').focus();
        }
    }, true);
});