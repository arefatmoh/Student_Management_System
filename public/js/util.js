window.showToast = function(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
};

window.setActiveNav = function() {
    const path = location.pathname;
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === path) a.classList.add('active');
        else a.classList.remove('active');
    });
};


