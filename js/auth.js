import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';

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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
    } catch (error) {
        showAlert(error.message, 'error');
    }
});
