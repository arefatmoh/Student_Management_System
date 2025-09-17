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

// Simple API wrapper with error handling and optional debug
window.apiFetch = async function(url, options) {
    const debug = false; // set true temporarily for debugging
    try {
        if (debug) console.log('[apiFetch] request', url, options);
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            const message = (data && data.message) ? data.message : `HTTP ${res.status}`;
            throw new Error(message);
        }
        if (debug) console.log('[apiFetch] response', data);
        return data;
    } catch (err) {
        if (debug) console.error('[apiFetch] error', err);
        throw err;
    }
};


