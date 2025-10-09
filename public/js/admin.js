// Admin Page JavaScript
console.log('Admin.js loaded successfully!');
let allUsers = [];
let filteredUsers = [];

// Handle Create User - moved to top for accessibility
async function handleCreateUser(e) {
    console.log('🎯 === HANDLE CREATE USER FUNCTION ENTERED ===');
    console.log('🎯 Event object:', e);
    console.log('🎯 Function called at:', new Date().toISOString());
    console.log('🎯 This is a test log to verify function execution');
    
    // Test if we can access global variables
    console.log('🎯 allUsers variable:', allUsers);
    console.log('🎯 filteredUsers variable:', filteredUsers);
    
    e.preventDefault();
    
    console.log('🎯 Getting form elements...');
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const roleEl = document.getElementById('role');
    const profilePictureEl = document.getElementById('profilePicture');
    
    console.log('🎯 Form elements found:');
    console.log('  - Username element:', usernameEl);
    console.log('  - Password element:', passwordEl);
    console.log('  - Role element:', roleEl);
    console.log('  - Profile picture element:', profilePictureEl);
    
    const username = usernameEl ? usernameEl.value : '';
    const password = passwordEl ? passwordEl.value : '';
    const role = roleEl ? roleEl.value : '';
    const profilePicture = profilePictureEl ? profilePictureEl.files[0] : null;
    
    console.log('=== FRONTEND USER CREATION DEBUG ===');
    console.log('📝 Form data extracted:');
    console.log('  - Username:', username);
    console.log('  - Password:', password ? '***' + password.slice(-2) : 'EMPTY');
    console.log('  - Role:', role);
    console.log('  - Profile Picture File:', profilePicture);
    
    if (profilePicture) {
        console.log('📸 Profile Picture Details:');
        console.log('  - File Name:', profilePicture.name);
        console.log('  - File Size:', profilePicture.size, 'bytes');
        console.log('  - File Type:', profilePicture.type);
        console.log('  - Last Modified:', new Date(profilePicture.lastModified));
    } else {
        console.log('❌ No profile picture selected');
    }
    
    if (!username || !password || !role) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Check if username already exists
    console.log('🎯 Checking username uniqueness...');
    console.log('🎯 allUsers array:', allUsers);
    console.log('🎯 allUsers length:', allUsers ? allUsers.length : 'undefined');
    
    if (allUsers && allUsers.some(user => user.username === username)) {
        console.log('🎯 Username already exists, showing error');
        showToast('Username already exists', 'error');
        return;
    }
    
    console.log('🎯 Username is unique, proceeding...');
    
    try {
        console.log('🎯 Starting try block...');
        showLoading();
        console.log('🎯 Loading state set, proceeding with FormData...');
        
        // Create FormData for file upload
        console.log('🔧 Creating FormData...');
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role);
        
        if (profilePicture) {
            formData.append('profilePicture', profilePicture);
            console.log('✅ Added profile picture to FormData:', profilePicture.name, profilePicture.size, 'bytes');
        } else {
            console.log('⚠️ No profile picture to add to FormData');
        }
        
        console.log('📦 FormData contents:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }
        
        console.log('🚀 Sending request to /api/users...');
        const response = await fetch('/api/users', {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Server response status:', response.status, response.statusText);
        const responseData = await response.json();
        console.log('📄 Server response data:', responseData);
        
        if (responseData.user) {
            console.log('👤 Created user details:');
            console.log('  - ID:', responseData.user.id);
            console.log('  - Username:', responseData.user.username);
            console.log('  - Role:', responseData.user.role);
            console.log('  - Profile Picture:', responseData.user.PROFILE_PICTURE);
        }
        
        if (response.ok) {
            showToast('User created successfully!', 'success');
            clearForm();
            await loadUsers();
        } else {
            showToast(responseData.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('🎯 ❌ Error in handleCreateUser try block:', error);
        console.error('🎯 ❌ Error message:', error.message);
        console.error('🎯 ❌ Error stack:', error.stack);
        showToast('Failed to create user', 'error');
    } finally {
        console.log('🎯 Finally block executing...');
        hideLoading();
        console.log('=== END FRONTEND USER CREATION DEBUG ===');
    }
}

// Make function available globally for debugging
window.handleCreateUser = handleCreateUser;

// Test function to verify function calls work
window.testFunction = function() {
    console.log('🧪 TEST FUNCTION CALLED SUCCESSFULLY!');
    return 'test completed';
};

// Alternative function to test if the issue is with the original function
window.createUserAlternative = async function(e) {
    console.log('🔄 ALTERNATIVE FUNCTION CALLED!');
    console.log('🔄 Event:', e);
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const profilePicture = document.getElementById('profilePicture').files[0];
    
    console.log('🔄 Form data:', { username, password: '***', role, profilePicture: profilePicture ? profilePicture.name : 'none' });
    
    if (!username || !password || !role) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role);
        if (profilePicture) {
            formData.append('profilePicture', profilePicture);
        }
        
        console.log('🔄 Sending request...');
        const response = await fetch('/api/users', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('🔄 Response:', result);
        
        if (response.ok) {
            showToast('User created successfully!', 'success');
            // Clear form
            clearForm();
            // Reload users list
            await loadUsers();
        } else {
            showToast('Error: ' + (result.message || 'Failed to create user'), 'error');
        }
    } catch (error) {
        console.error('🔄 Error:', error);
        showToast('Error: ' + error.message, 'error');
    }
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Starting admin page initialization');
    
    try {
        await loadUsers();
        console.log('✅ Users loaded');
        
        console.log('🔧 Setting up event listeners...');
        setupEventListeners();
        console.log('✅ Event listeners setup complete');
        
        console.log('🔧 Setting up profile picture upload...');
        setupProfilePictureUpload();
        console.log('✅ Profile picture upload setup complete');
        
        // Add additional debug for submit button
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('Submit button found:', submitButton);
            submitButton.addEventListener('click', async (e) => {
                console.log('Submit button clicked!');
                // Prevent default form submission
                e.preventDefault();
                console.log('Default form submission prevented');
                // Call our handler directly
                console.log('🎯 Calling handleCreateUser directly...');
                console.log('handleCreateUser function:', typeof handleCreateUser);
                if (typeof handleCreateUser === 'function') {
                    console.log('✅ handleCreateUser is a function, calling it...');
                    try {
                        console.log('🚀 About to call handleCreateUser...');
                        
                        // Test simple function call first
                        console.log('🧪 Testing simple function call...');
                        const testResult = window.testFunction();
                        console.log('🧪 Test function result:', testResult);
                        
                        // Test alternative function
                        console.log('🔄 Testing alternative function...');
                        await window.createUserAlternative(e);
                        console.log('🔄 Alternative function completed');
                        
                        const result = await handleCreateUser(e);
                        console.log('✅ handleCreateUser completed successfully:', result);
                    } catch (error) {
                        console.error('❌ Error calling handleCreateUser:', error);
                        console.error('❌ Error stack:', error.stack);
                    }
                } else {
                    console.error('❌ handleCreateUser is not a function!', handleCreateUser);
                }
            });
        } else {
            console.error('Submit button not found!');
        }
        
        // Test form submission directly
        console.log('🧪 Testing form submission...');
        const testForm = document.getElementById('user-form');
        if (testForm) {
            console.log('✅ Test form found:', testForm);
        } else {
            console.error('❌ Test form not found!');
        }
        
        // Test handleCreateUser function availability
        console.log('🧪 Testing handleCreateUser function...');
        console.log('handleCreateUser type:', typeof handleCreateUser);
        console.log('handleCreateUser value:', handleCreateUser);
        
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

// Setup Event Listeners
function setupEventListeners() {
    try {
        console.log('Setting up event listeners...');
        const userForm = document.getElementById('user-form');
        const searchInput = document.getElementById('userSearch');
        
        console.log('User form element:', userForm);
        console.log('Search input element:', searchInput);
        
        if (userForm) {
            console.log('Adding submit event listener to user form');
            userForm.addEventListener('submit', (e) => {
                console.log('🎯 Form submit event triggered!');
                handleCreateUser(e);
            });
        } else {
            console.error('User form not found!');
        }
    } catch (error) {
        console.error('❌ Error in setupEventListeners:', error);
    }
    
    if (searchInput) {
        console.log('Adding input event listener to search input');
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    } else {
        console.error('Search input not found!');
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
        
        console.log('🎯 File dropped');
        const files = e.dataTransfer.files;
        console.log('📁 Dropped files:', files);
        console.log('📊 Number of dropped files:', files.length);
        
        if (files.length > 0) {
            console.log('✅ File dropped, calling handleFileSelect');
            handleFileSelect(files[0]);
        } else {
            console.log('❌ No files in drop');
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
        console.log('🔄 File input changed');
        console.log('📁 Files in input:', e.target.files);
        console.log('📊 Number of files:', e.target.files.length);
        
        if (e.target.files.length > 0) {
            console.log('✅ File found, calling handleFileSelect');
            handleFileSelect(e.target.files[0]);
        } else {
            console.log('❌ No files selected');
        }
    });
}

// Handle File Selection
function handleFileSelect(file) {
    console.log('=== FILE SELECTION DEBUG ===');
    console.log('📁 File selected:', file);
    console.log('📸 File details:');
    console.log('  - Name:', file.name);
    console.log('  - Size:', file.size, 'bytes');
    console.log('  - Type:', file.type);
    console.log('  - Last Modified:', new Date(file.lastModified));
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.log('❌ Invalid file type:', file.type);
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    console.log('✅ File validation passed');
    
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
                        ${user.PROFILE_PICTURE ? 
                            `<img src="/${user.PROFILE_PICTURE}" alt="${user.username}" />` : 
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

// Handle Create User function moved to top of file

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

// Global assignment already done at top of file

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
