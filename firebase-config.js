import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyC-Fmq_WK6lJTcVofEFhPrQb2oXfYzGSwA",
    authDomain: "anhsay-b8c66.firebaseapp.com",
    databaseURL: "https://anhsay-b8c66-default-rtdb.firebaseio.com",
    projectId: "anhsay-b8c66",
    storageBucket: "anhsay-b8c66.firebasestorage.app",
    messagingSenderId: "77426464330",
    appId: "1:77426464330:web:b13a625222eb5264a5f8b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
