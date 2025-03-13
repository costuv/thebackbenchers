import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, onValue, push, remove, update, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

let currentUser = null;
let isAuthor = false;

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
        
        // Remove the old new story button as it's replaced by admin page
        const addStory = document.getElementById('addStory');
        if (addStory) addStory.remove();
        
        loadStories();
    } else {
        document.getElementById('loadingScreen').classList.add('hidden');
        window.location.href = 'login.html';
    }
});

// Add these functions to the global scope
window.editStory = function(key) {
    // Add edit functionality here
};

window.deleteStory = function(key) {
    // Add delete functionality here
};

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
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Story loading - changed to create chapter menu instead
function loadStories() {
    const storiesRef = ref(database, 'stories');
    onValue(storiesRef, async (snapshot) => {
        const stories = snapshot.val();
        const chaptersContainer = document.getElementById('chapters');
        chaptersContainer.innerHTML = '';
        
        if (!stories) {
            chaptersContainer.innerHTML = '<p class="text-center text-gray-500">No chapters available yet</p>';
            return;
        }
        
        // Convert to array and sort by createdAt
        const storiesArray = Object.entries(stories).map(([id, story]) => ({
            id,
            ...story
        })).sort((a, b) => a.createdAt - b.createdAt);
        
        // Update chapter count
        document.getElementById('chapterCount').textContent = `${storiesArray.length} Chapter${storiesArray.length !== 1 ? 's' : ''}`;
        
        // Group stories by month/year
        const storyGroups = {};
        for (const story of storiesArray) {
            const date = new Date(story.createdAt);
            const monthYear = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
            
            if (!storyGroups[monthYear]) {
                storyGroups[monthYear] = [];
            }
            storyGroups[monthYear].push(story);
        }
        
        // Create chapter sections by month
        for (const [monthYear, stories] of Object.entries(storyGroups)) {
            // Create section header
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'bg-gray-100 p-3 section-header';
            sectionHeader.innerHTML = `<h4 class="font-medium text-gray-700">${monthYear}</h4>`;
            chaptersContainer.appendChild(sectionHeader);
            
            // Create chapters for this month
            for (let i = 0; i < stories.length; i++) {
                const story = stories[i];
                const chapterNumber = storiesArray.findIndex(s => s.id === story.id) + 1;
                
                // Get author info
                let authorName = 'Unknown Author';
                try {
                    const userRef = ref(database, 'users/' + story.authorId);
                    const userSnapshot = await get(userRef);
                    const userData = userSnapshot.val();
                    authorName = userData?.characterName || userData?.fullName || 'Unknown Author';
                } catch (error) {
                    console.error('Error getting author info:', error);
                }
                
                // Format date
                const date = new Date(story.createdAt);
                const formattedDate = date.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short'
                });
                
                const chapterLink = document.createElement('div');
                chapterLink.className = 'chapter-item';
                chapterLink.innerHTML = `
                    <a href="chapter.html?id=${story.id}" class="block p-4 hover:bg-gray-50 transition-colors">
                        <div class="flex items-center">
                            <div class="chapter-number flex-shrink-0 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                                ${chapterNumber}
                            </div>
                            <div class="flex-grow">
                                <h5 class="font-benguiat text-lg">${story.title}</h5>
                                <div class="flex flex-wrap text-sm text-gray-500 mt-1">
                                    <span class="mr-3">By ${authorName}</span>
                                    <span>${formattedDate}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
                chaptersContainer.appendChild(chapterLink);
            }
        }
    });
}

// Story adding function
document.getElementById('newStoryBtn').addEventListener('click', async () => {
    if (!isAuthor) {
        alert('Only authors can add stories');
        return;
    }
    
    // Get user's character name
    const userRef = ref(database, 'users/' + currentUser.uid);
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    if (!userData || !userData.characterName) {
        alert('Author information not found');
        return;
    }
    
    const title = prompt('Enter story title:');
    const content = prompt('Enter story content:');
    
    if (title && content) {
        const storyRef = ref(database, 'stories');
        push(storyRef, {
            title: title,
            content: content,
            authorId: currentUser.uid,
            createdAt: Date.now()
        });
    }
});

// Add other necessary functions for story management, profile handling, etc.
