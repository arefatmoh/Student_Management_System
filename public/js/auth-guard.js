async function ensureAuth(requiredRole) {
    try {
        const me = await apiFetch('/api/auth/me');
        if (requiredRole && me.role !== requiredRole) {
            location.href = '/index.html';
        }
    } catch {
        location.href = '/login.html';
    }
}

async function logout() {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
        location.href = '/login.html';
    }
}

// Show Admin link for admins
document.addEventListener('DOMContentLoaded', () => {
    apiFetch('/api/auth/me').then(me => {
        if (me.role === 'admin') {
            const link = document.getElementById('adminLink');
            if (link) link.classList.remove('hidden');
        }
    }).catch(()=>{});
});


