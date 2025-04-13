class Feedback {
    static showLoading(container) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
        container.appendChild(loader);
        return loader;
    }
    
    static hideLoading(loader) {
        if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    }
    
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    static showModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay fade-in';
        
        const modalContent = `
            <div class="modal-content">
                <h3>${title}</h3>
                <div class="modal-body">${content}</div>
                <div class="modal-actions">
                    ${buttons.map(btn => 
                        `<button class="btn ${btn.class || ''}" 
                                onclick="${btn.action || ''}">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        return modal;
    }
}

// Add to your main.js
document.addEventListener('DOMContentLoaded', function() {
    // Example usage:
    // Feedback.showToast('Settings saved successfully!', 'success');
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('fade-out');
            setTimeout(() => {
                if (e.target.parentNode) {
                    e.target.parentNode.removeChild(e.target);
                }
            }, 300);
        }
    });
});