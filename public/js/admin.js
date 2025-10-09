// Admin Page JavaScript
let allUsers = [];
let filteredUsers = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    await ensureAuth();
    await loadUsers();
    setupEventListeners();
    setupProfilePictureUpload();
});

// Setup Event Listeners
function setupEventListeners() {
    const userForm = document.getElementById('user-form');
    const searchInput = document.getElementById('userSearch');
    
    if (userForm) {
        userForm.addEventListener('submit', handleCreateUser);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

// Setup Profile Picture Upload
function setupProfilePictureUpload() {
    const uploadArea = document.getElementById('profileUploadArea');
    const fileInput = document.getElementById('profilePicture');
    
    if (!uploadArea || !fileInput) return;
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // Click to upload
    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-content')) {
            fileInput.click();
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// Handle File Selection
function handleFileSelect(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        showImagePreview(e.target.result, file);
    };
    reader.readAsDataURL(file);
}

// Show Image Preview
function showImagePreview(imageSrc, file) {
    const uploadContent = document.getElementById('uploadContent');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (uploadContent && imagePreview && previewImg) {
        // Hide upload content, show preview
        uploadContent.style.display = 'none';
        imagePreview.style.display = 'flex';
        
        // Set image source
        previewImg.src = imageSrc;
        
        // Set file info
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
    }
}

// Remove Profile Picture
function removeProfilePicture() {
    const uploadContent = document.getElementById('uploadContent');
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('profilePicture');
    
    if (uploadContent && imagePreview && fileInput) {
        // Show upload content, hide preview
        uploadContent.style.display = 'flex';
        imagePreview.style.display = 'none';
        
        // Clear file input
        fileInput.value = '';
    }
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Load Users
async function loadUsers() {
    try {
        showLoading();
        const response = await fetch('/api/users');
        const data = await response.json();
        
        allUsers = data.data || data || [];
        filteredUsers = [...allUsers];
        
        renderUsers();
        updateStats();
        hideLoading();
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
        hideLoading();
    }
}

// Render Users
function renderUsers() {
    const usersTable = document.getElementById('usersTable');
    const emptyState = document.getElementById('emptyState');
    
    if (!usersTable) return;
    
    if (filteredUsers.length === 0) {
        usersTable.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    usersTable.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    
    const tbody = usersTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.profile_picture ? 
                            `<img src="/uploads/profiles/${user.profile_picture}" alt="${user.username}" />` : 
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.username}</div>
                        <div class="user-id">ID: ${user.user_id || user.id}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge role-${user.role}">${user.role}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editUser(${user.user_id || user.id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteUser(${user.user_id || user.id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update Statistics
function updateStats() {
    const totalUsers = document.getElementById('totalUsers');
    const adminUsers = document.getElementById('adminUsers');
    const teacherUsers = document.getElementById('teacherUsers');
    
    if (totalUsers) totalUsers.textContent = allUsers.length;
    if (adminUsers) adminUsers.textContent = allUsers.filter(u => u.role === 'admin').length;
    if (teacherUsers) teacherUsers.textContent = allUsers.filter(u => u.role === 'teacher').length;
}

// Handle Create User
async function handleCreateUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const profilePicture = document.getElementById('profilePicture').files[0];
    
    if (!username || !password || !role) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Check if username already exists
    if (allUsers.some(user => user.username === username)) {
        showToast('Username already exists', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role);
        if (profilePicture) {
            formData.append('profilePicture', profilePicture);
        }
        
        const response = await fetch('/api/users', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showToast('User created successfully!', 'success');
            clearForm();
            await loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showToast('Failed to create user', 'error');
    } finally {
        hideLoading();
    }
}

// Clear Form
function clearForm() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('role').value = '';
    removeProfilePicture();
}

// Handle Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        user.id.toString().includes(query)
    );
    renderUsers();
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        showLoading();
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('User deleted successfully!', 'success');
            await loadUsers();
        } else {
            showToast('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user', 'error');
    } finally {
        hideLoading();
    }
}

// Edit User (placeholder)
function editUser(userId) {
    showToast('Edit functionality coming soon!', 'info');
}

// Export Users
function exportUsers() {
    const csv = generateUsersCSV();
    downloadCSV(csv, 'users.csv');
}

// Generate Users CSV
function generateUsersCSV() {
    const headers = ['ID', 'Username', 'Role', 'Created'];
    const rows = allUsers.map(user => [
        user.id,
        user.username,
        user.role,
        new Date().toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Download CSV
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Refresh Users
function refreshUsers() {
    loadUsers();
}

// Show User Guide
function showUserGuide() {
    showToast('User guide coming soon!', 'info');
}

// UI Helper Functions
function showLoading() {
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
}

function hideLoading() {
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create User';
    }
}

function showError(message) {
    showToast(message, 'error');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced Toast Notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-500)' : type === 'error' ? 'var(--error-500)' : 'var(--info-500)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
