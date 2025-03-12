import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, push, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

let currentUser = null;

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
        const storyRef = ref(database, 'stories');
        await push(storyRef, {
            title,
            content,
            authorId: currentUser.uid,
            createdAt: Date.now()
        });
        
        showAlert('Story published successfully!', 'success');
        document.getElementById('storyForm').reset();
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
