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

// Add logout button to header nav
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('header nav');
    if (nav) {
        const btn = document.createElement('button');
        btn.textContent = 'Logout';
        btn.className = 'secondary';
        btn.style.marginLeft = '12px';
        btn.addEventListener('click', logout);
        nav.appendChild(btn);
    }
});


