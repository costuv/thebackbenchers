import { auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

function showAlert(message, type) {
    const successAlert = document.getElementById('alertSuccess');
    const errorAlert = document.getElementById('alertError');
    
    successAlert.classList.add('hidden');
    errorAlert.classList.add('hidden');
    
    if (type === 'success') {
        successAlert.textContent = message;
        successAlert.classList.remove('hidden');
        // Auto hide success message after 3 seconds
        setTimeout(() => {
            successAlert.classList.add('hidden');
        }, 3000);
    } else {
        errorAlert.textContent = message;
        errorAlert.classList.remove('hidden');
    }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const characterName = document.getElementById('characterName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Input validation
    if (!fullName || !characterName || !email || !password) {
        showAlert('All fields are required', 'error');
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

        const role = document.getElementById('role').value;
        // Only require character name for authors
        if (role === 'author' && !characterName) {
            showAlert('Character name is required for authors', 'error');
            await user.delete();
            return;
        }

        // Then store user data
        try {
            await set(ref(database, 'users/' + user.uid), {
                fullName: fullName,
                characterName: role === 'author' ? characterName : null,
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
