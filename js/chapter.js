import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';
import { CommentManager } from './comments.js';
import { notificationManager } from './notifications.js';

let currentUser = null;
let isAuthor = false;
let currentStoryId = null;
let allStories = [];
let commentManager = null;

// Get the story ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('id');

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('authContent').classList.remove('hidden');
        document.getElementById('loginPrompt').classList.add('hidden');
        
        // Check if user is an author
        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        isAuthor = userData && userData.role === 'author';
        
        // Show/hide admin links based on author status (both desktop and mobile)
        document.getElementById('adminLinkDesktop')?.classList.toggle('hidden', !isAuthor);
        document.getElementById('adminLinkMobile')?.classList.toggle('hidden', !isAuthor);
        
        // Load all stories to find current one's position
        loadAllStories();
        
        // Load the current story
        if (storyId) {
            loadStory(storyId);
        } else {
            window.location.href = '/index.html';
        }
    } else {
        document.getElementById('loadingScreen').classList.add('hidden');
        window.location.href = '/html/login.html';
    }
});

// Profile button handler
document.getElementById('profileBtn')?.addEventListener('click', async () => {
    const userRef = ref(database, 'users/' + currentUser.uid);
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg w-full max-w-md overflow-y-auto max-h-[90vh]">
            <div class="flex justify-between items-center mb-4 md:mb-6 border-b pb-3">
                <h2 class="text-lg md:text-xl font-benguiat">Profile</h2>
                <button id="closeProfileBtn" class="text-2xl p-2">&times;</button>
            </div>
            
            <!-- User Information Section -->
            <div class="space-y-4 mb-6">
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Full Name</label>
                    <p>${userData.fullName}</p>
                </div>
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Email</label>
                    <p>${userData.email}</p>
                </div>
                ${userData.characterName ? `
                    <div class="border-b pb-2">
                        <label class="text-xs text-gray-500">Character Name</label>
                        <p>${userData.characterName}</p>
                    </div>
                ` : ''}
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Role</label>
                    <p class="capitalize">${userData.role}</p>
                </div>
            </div>
            
            <!-- Change Password Section -->
            <div class="mb-6">
                <h3 class="font-medium mb-4">Change Password</h3>
                <div id="passwordAlertSuccess" class="hidden mb-4 text-sm p-2 rounded text-green-700 bg-green-100 border border-green-400"></div>
                <div id="passwordAlertError" class="hidden mb-4 text-sm p-2 rounded text-red-700 bg-red-100 border border-red-400"></div>
                
                <form id="changePasswordForm" class="space-y-4">
                    <div>
                        <input type="password" id="currentPassword" placeholder="Current Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <input type="password" id="newPassword" placeholder="New Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <button type="submit" class="w-full p-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-all">
                        Update Password
                    </button>
                </form>
            </div>
            
            <button id="closeProfileBtnBottom" class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Password change handler
    modal.querySelector('#changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = modal.querySelector('#currentPassword').value;
        const newPassword = modal.querySelector('#newPassword').value;
        const confirmNewPassword = modal.querySelector('#confirmNewPassword').value;
        
        const passwordSuccessAlert = modal.querySelector('#passwordAlertSuccess');
        const passwordErrorAlert = modal.querySelector('#passwordAlertError');
        
        // Reset alerts
        passwordSuccessAlert.classList.add('hidden');
        passwordErrorAlert.classList.add('hidden');
        
        // Validate form
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            passwordErrorAlert.textContent = 'All fields are required';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            passwordErrorAlert.textContent = 'New passwords do not match';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        if (newPassword.length < 6) {
            passwordErrorAlert.textContent = 'New password must be at least 6 characters';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        try {
            // Import necessary Firebase functions
            const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
            
            // First re-authenticate the user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Then update password
            await updatePassword(currentUser, newPassword);
            
            // Show success
            passwordSuccessAlert.textContent = 'Password updated successfully';
            passwordSuccessAlert.classList.remove('hidden');
            
            // Reset form
            modal.querySelector('#changePasswordForm').reset();
        } catch (error) {
            let errorMessage = 'Failed to update password: ';
            
            switch(error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Current password is incorrect';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'New password is too weak';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Please log out and log back in to change your password';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            passwordErrorAlert.textContent = errorMessage;
            passwordErrorAlert.classList.remove('hidden');
        }
    });
    
    // Close modal when clicking outside or on close button
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'closeProfileBtn' || e.target.id === 'closeProfileBtnBottom') {
            modal.remove();
        }
    });
});

// Logout button handler
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/html/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

// Load all stories to determine sequence
function loadAllStories() {
    const storiesRef = ref(database, 'stories');
    onValue(storiesRef, (snapshot) => {
        const stories = snapshot.val();
        if (stories) {
            // Convert to array and sort by createdAt
            allStories = Object.entries(stories).map(([id, story]) => ({
                id,
                ...story
            })).sort((a, b) => a.createdAt - b.createdAt);
            
            // Update navigation links
            updateNavigation();
        }
    });
}

// Load a specific story
function loadStory(id) {
    currentStoryId = id;
    const storyRef = ref(database, 'stories/' + id);
    onValue(storyRef, async (snapshot) => {
        const story = snapshot.val();
        if (story) {
            // Get author info
            const userRef = ref(database, 'users/' + story.authorId);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();
            const authorName = userData ? userData.characterName || userData.fullName : 'Unknown';
            
            // Find position in sequence
            const position = allStories.findIndex(s => s.id === id);
            const chapterNumber = position + 1;
            
            // Format date nicely
            const createdDate = new Date(story.createdAt);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Format content to preserve formatting
            const formattedContent = story.content
                // Replace newlines with paragraph tags
                .split('\n\n')
                .map(paragraph => `<p>${paragraph}</p>`)
                .join('');
            
            // Update UI
            document.title = `Chapter ${chapterNumber}: ${story.title} - The Backbenchers`;
            document.getElementById('chapterTitle').textContent = `Chapter ${chapterNumber}: ${story.title}`;
            document.getElementById('authorInfo').innerHTML = `
                <span class="font-medium">Written by ${authorName}</span>
                <span class="mx-2 opacity-50">•</span>
                <span class="text-sm">${formattedDate}</span>
            `;
            document.getElementById('storyContent').innerHTML = formattedContent;
            
            // Show edit controls for the author
            const canEdit = story.authorId === currentUser.uid;
            document.getElementById('editControls').classList.toggle('hidden', !canEdit);
            
            // Update navigation
            updateNavigation();

            // Initialize comments after story is loaded
            try {
                if (commentManager) {
                    commentManager.cleanup(); // Cleanup existing instance
                }
                commentManager = new CommentManager(id);
            } catch (error) {
                console.error("Error initializing comments:", error);
            }

            // Remove loading screen after everything is loaded
            document.getElementById('loadingScreen').classList.add('hidden');
        } else {
            document.getElementById('loadingScreen').classList.add('hidden');
            window.location.href = '/index.html';
        }
    }, (error) => {
        console.error("Error loading story:", error);
        document.getElementById('loadingScreen').classList.add('hidden');
        window.location.href = '/index.html';
    });
}

// Update the navigation links
function updateNavigation() {
    if (!currentStoryId || !allStories.length) return;
    
    const currentIndex = allStories.findIndex(s => s.id === currentStoryId);
    const prevChapterLink = document.getElementById('prevChapter');
    const nextChapterLink = document.getElementById('nextChapter');
    
    // Previous chapter
    if (currentIndex > 0) {
        const prevStory = allStories[currentIndex-1];
        const prevChapterNumber = currentIndex;
        prevChapterLink.href = `/html/chapter.html?id=${prevStory.id}`;
        prevChapterLink.innerHTML = `&larr; Chapter ${prevChapterNumber}`;
        prevChapterLink.classList.remove('hidden');
    } else {
        prevChapterLink.classList.add('hidden');
    }
    
    // Next chapter
    if (currentIndex < allStories.length - 1) {
        const nextStory = allStories[currentIndex+1];
        const nextChapterNumber = currentIndex + 2;
        nextChapterLink.href = `/html/chapter.html?id=${nextStory.id}`;
        nextChapterLink.innerHTML = `Chapter ${nextChapterNumber} &rarr;`;
        nextChapterLink.classList.remove('hidden');
    } else {
        nextChapterLink.classList.add('hidden');
    }
}

// Edit chapter button handler
document.getElementById('editChapter')?.addEventListener('click', () => {
    window.location.href = `/html/admin.html?edit=${currentStoryId}`;
});

// Delete chapter button handler
document.getElementById('deleteChapter')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this chapter?')) {
        await remove(ref(database, 'stories/' + currentStoryId));
        window.location.href = '/index.html';
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

// Update profile button handlers for both desktop and mobile
document.getElementById('profileBtnDesktop')?.addEventListener('click', showProfileModal);
document.getElementById('profileBtnMobile')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    showProfileModal();
});

// Update logout button handlers for both desktop and mobile
document.getElementById('logoutBtnDesktop')?.addEventListener('click', handleLogout);
document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

// Add notification handlers
document.getElementById('notificationBtn')?.addEventListener('click', showNotifications);
document.getElementById('notificationBtnMobile')?.addEventListener('click', () => {
    // Close mobile menu first
    document.getElementById('mobileMenu').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    // Show notifications
    showNotifications();
});

async function showNotifications() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg w-full max-w-md mt-16 max-h-[80vh] overflow-y-auto">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-medium">Notifications</h3>
                <button id="closeNotificationsBtn" class="text-gray-400 hover:text-gray-500">&times;</button>
            </div>
            <div id="notificationsList" class="divide-y divide-gray-100">
                Loading...
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load notifications
    const notificationsRef = ref(database, `notifications/${currentUser.uid}`);
    const snapshot = await get(notificationsRef);
    const notifications = snapshot.val() || {};
    
    const notificationsList = modal.querySelector('#notificationsList');
    notificationsList.innerHTML = '';
    
    Object.entries(notifications)
        .sort(([,a], [,b]) => b.timestamp - a.timestamp)
        .forEach(([id, notification]) => {
            const div = document.createElement('div');
            div.className = `p-4 ${notification.read ? 'bg-white' : 'bg-blue-50'}`;
            
            switch(notification.type) {
                case 'mention':
                    div.innerHTML = `
                        <p><strong>@${notification.data.from}</strong> mentioned you</p>
                        <p class="text-sm text-gray-500">${notification.data.preview}</p>
                        <p class="text-xs text-gray-400 mt-1">${new Date(notification.timestamp).toLocaleString()}</p>
                    `;
                    break;
                // Add other notification types here
            }
            
            notificationsList.appendChild(div);
            
            // Mark as read when viewed
            if (!notification.read) {
                notificationManager.markAsRead(id);
            }
        });
    
    if (!Object.keys(notifications).length) {
        notificationsList.innerHTML = '<p class="p-4 text-gray-500">No notifications</p>';
    }
    
    // Close modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'closeNotificationsBtn') {
            modal.remove();
        }
    });
}

// Profile modal function
async function showProfileModal() {
    const userRef = ref(database, 'users/' + currentUser.uid);
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg w-full max-w-md overflow-y-auto max-h-[90vh]">
            <div class="flex justify-between items-center mb-4 md:mb-6 border-b pb-3">
                <h2 class="text-lg md:text-xl font-benguiat">Profile</h2>
                <button id="closeProfileBtn" class="text-2xl p-2">&times;</button>
            </div>
            
            <!-- User Information Section -->
            <div class="space-y-4 mb-6">
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Full Name</label>
                    <p>${userData.fullName}</p>
                </div>
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Email</label>
                    <p>${userData.email}</p>
                </div>
                ${userData.characterName ? `
                    <div class="border-b pb-2">
                        <label class="text-xs text-gray-500">Character Name</label>
                        <p>${userData.characterName}</p>
                    </div>
                ` : ''}
                <div class="border-b pb-2">
                    <label class="text-xs text-gray-500">Role</label>
                    <p class="capitalize">${userData.role}</p>
                </div>
            </div>
            
            <!-- Change Password Section -->
            <div class="mb-6">
                <h3 class="font-medium mb-4">Change Password</h3>
                <div id="passwordAlertSuccess" class="hidden mb-4 text-sm p-2 rounded text-green-700 bg-green-100 border border-green-400"></div>
                <div id="passwordAlertError" class="hidden mb-4 text-sm p-2 rounded text-red-700 bg-red-100 border border-red-400"></div>
                
                <form id="changePasswordForm" class="space-y-4">
                    <div>
                        <input type="password" id="currentPassword" placeholder="Current Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <input type="password" id="newPassword" placeholder="New Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" required
                            class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <button type="submit" class="w-full p-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-all">
                        Update Password
                    </button>
                </form>
            </div>
            
            <button id="closeProfileBtnBottom" class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Password change handler
    modal.querySelector('#changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = modal.querySelector('#currentPassword').value;
        const newPassword = modal.querySelector('#newPassword').value;
        const confirmNewPassword = modal.querySelector('#confirmNewPassword').value;
        
        const passwordSuccessAlert = modal.querySelector('#passwordAlertSuccess');
        const passwordErrorAlert = modal.querySelector('#passwordAlertError');
        
        // Reset alerts
        passwordSuccessAlert.classList.add('hidden');
        passwordErrorAlert.classList.add('hidden');
        
        // Validate form
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            passwordErrorAlert.textContent = 'All fields are required';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            passwordErrorAlert.textContent = 'New passwords do not match';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        if (newPassword.length < 6) {
            passwordErrorAlert.textContent = 'New password must be at least 6 characters';
            passwordErrorAlert.classList.remove('hidden');
            return;
        }
        
        try {
            // Import necessary Firebase functions
            const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
            
            // First re-authenticate the user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Then update password
            await updatePassword(currentUser, newPassword);
            
            // Show success
            passwordSuccessAlert.textContent = 'Password updated successfully';
            passwordSuccessAlert.classList.remove('hidden');
            
            // Reset form
            modal.querySelector('#changePasswordForm').reset();
        } catch (error) {
            let errorMessage = 'Failed to update password: ';
            
            switch(error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Current password is incorrect';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'New password is too weak';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Please log out and log back in to change your password';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            passwordErrorAlert.textContent = errorMessage;
            passwordErrorAlert.classList.remove('hidden');
        }
    });
    
    // Close modal when clicking outside or on close button
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'closeProfileBtn' || e.target.id === 'closeProfileBtnBottom') {
            modal.remove();
        }
    });
}

// Logout handler function
async function handleLogout() {
    try {
        if (commentManager) {
            commentManager.cleanup(); // Cleanup before logout
        }
        await signOut(auth);
        window.location.href = '/html/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}