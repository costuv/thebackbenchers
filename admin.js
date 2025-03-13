import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, push, get, update } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

let currentUser = null;
let editMode = false;
let storyId = null;

function showAlert(message, type) {
    const successAlert = document.getElementById('alertSuccess');
    const errorAlert = document.getElementById('alertError');
    
    successAlert.classList.add('hidden');
    errorAlert.classList.add('hidden');
    
    if (type === 'success') {
        successAlert.textContent = message;
        successAlert.classList.remove('hidden');
        setTimeout(() => {
            successAlert.classList.add('hidden');
        }, 3000);
    } else {
        errorAlert.textContent = message;
        errorAlert.classList.remove('hidden');
    }
}

// Get URL parameters to check if we're in edit mode
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        editMode = true;
        storyId = editId;
        return true;
    }
    return false;
}

// Load existing story data when in edit mode
async function loadStoryForEdit() {
    if (!storyId) return;
    
    const storyRef = ref(database, 'stories/' + storyId);
    const snapshot = await get(storyRef);
    const story = snapshot.val();
    
    if (story) {
        document.getElementById('title').value = story.title || '';
        document.getElementById('content').value = story.content || '';
        
        // Update form title and button to reflect edit mode
        document.querySelector('#storyForm h2').textContent = 'Edit Story';
        document.querySelector('#storyForm button[type="submit"]').textContent = 'Update Story';
    } else {
        showAlert('Story not found or you do not have permission to edit it.', 'error');
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (!userData || userData.role !== 'author') {
            document.getElementById('loadingScreen').classList.add('hidden');
            showAlert('Access denied. Authors only.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // Check for edit mode
        if (getUrlParams()) {
            await loadStoryForEdit();
        }
        
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('authContent').classList.remove('hidden');
    } else {
        window.location.href = 'login.html';
    }
});

// Story form submission
document.getElementById('storyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    
    if (!title || !content) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    try {
        if (editMode && storyId) {
            // Update existing story
            const storyRef = ref(database, 'stories/' + storyId);
            await update(storyRef, {
                title,
                content,
                updatedAt: Date.now()
            });
            
            showAlert('Story updated successfully!', 'success');
            setTimeout(() => {
                window.location.href = `chapter.html?id=${storyId}`;
            }, 1500);
        } else {
            // Create new story
            const storyRef = ref(database, 'stories');
            await push(storyRef, {
                title,
                content,
                authorId: currentUser.uid,
                createdAt: Date.now()
            });
            
            showAlert('Story published successfully!', 'success');
            document.getElementById('storyForm').reset();
        }
    } catch (error) {
        showAlert('Failed to publish story: ' + error.message, 'error');
    }
});

// Mobile menu functionality
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Prevent scrolling when menu is open
});

document.getElementById('closeMenuBtn')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
});
