import { auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

function showAlert(message, type, alertElement = null) {
    const successAlert = alertElement || document.getElementById('alertSuccess');
    const errorAlert = alertElement || document.getElementById('alertError');
    
    if (successAlert) successAlert.classList.add('hidden');
    if (errorAlert) errorAlert.classList.add('hidden');
    
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

// Handle access code verification using Firebase Database
document.getElementById('accessCodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accessCode = document.getElementById('accessCode').value.trim();
    const accessCodeError = document.getElementById('accessCodeError');
    
    if (!accessCode) {
        accessCodeError.textContent = 'Please enter an access code';
        accessCodeError.classList.remove('hidden');
        return;
    }
    
    try {
        // Show loading indicator
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Verifying...';
        
        // Get the access code from Firebase
        const accessCodeRef = ref(database, 'config/registrationAccess/code');
        const snapshot = await get(accessCodeRef);
        
        if (!snapshot.exists()) {
            throw new Error('Access code not configured in database');
        }
        
        const validAccessCode = snapshot.val();
        
        // Compare with entered code
        if (accessCode === validAccessCode) {
            // If matched, allow registration
            document.getElementById('passwordProtection').classList.add('hidden');
            document.getElementById('registrationForm').classList.remove('hidden');
        } else {
            // If not matched, show error
            accessCodeError.textContent = 'Invalid access code';
            accessCodeError.classList.remove('hidden');
            
            setTimeout(() => {
                accessCodeError.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error('Error verifying access code:', error);
        accessCodeError.textContent = 'Error verifying access code';
        accessCodeError.classList.remove('hidden');
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const characterName = document.getElementById('characterName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;

    // Input validation
    if (!fullName || !email || !password) {
        showAlert('Full name, email and password are required', 'error');
        return;
    }

    // Only require character name for authors
    if (role === 'author' && !characterName) {
        showAlert('Character name is required for authors', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store user data
        try {
            await set(ref(database, 'users/' + user.uid), {
                fullName: fullName,
                characterName: role === 'author' ? characterName : (characterName || null), // Store character name for authors or if provided
                email: email,
                role: role,
                createdAt: Date.now()
            });

            showAlert('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (dbError) {
            // If database write fails, delete the auth user
            await user.delete();
            showAlert('Registration failed: Database error. Please try again.', 'error');
        }
    } catch (error) {
        let errorMessage = 'Registration failed: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email is already registered';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address';
                break;
            case 'auth/operation-not-allowed':
                errorMessage += 'Registration is currently disabled';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak';
                break;
            default:
                errorMessage += error.message;
        }
        showAlert(errorMessage, 'error');
    }
});

// Add dynamic character name requirement based on role selection
document.getElementById('role').addEventListener('change', function() {
    const characterNameInput = document.getElementById('characterName');
    const characterNameHint = document.getElementById('characterNameRequiredHint');
    
    if (this.value === 'author') {
        characterNameInput.setAttribute('required', 'required');
        characterNameHint.textContent = 'Required for authors';
    } else {
        characterNameInput.removeAttribute('required');
        characterNameHint.textContent = 'Optional for readers';
    }
});

// Initialize the character name requirement state on page load
window.addEventListener('DOMContentLoaded', () => {
    const roleSelect = document.getElementById('role');
    const characterNameInput = document.getElementById('characterName');
    const characterNameHint = document.getElementById('characterNameRequiredHint');
    
    if (roleSelect.value === 'author') {
        characterNameInput.setAttribute('required', 'required');
        characterNameHint.textContent = 'Required for authors';
    } else {
        characterNameInput.removeAttribute('required');
        characterNameHint.textContent = 'Optional for readers';
    }
});
