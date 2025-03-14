import { auth, database } from './firebase-config.js';
import { ref, push, onValue, update, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

export class NotificationManager {
    constructor() {
        this.currentUser = null;
        this.notificationCount = 0;
        this.initialize();
    }

    initialize() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.listenToNotifications();
            }
        });
    }

    listenToNotifications() {
        const notificationsRef = ref(database, `notifications/${this.currentUser.uid}`);
        onValue(notificationsRef, (snapshot) => {
            const notifications = snapshot.val() || {};
            this.notificationCount = Object.values(notifications)
                .filter(n => !n.read).length;
            this.updateUI();
        });
    }

    updateUI() {
        const counter = document.getElementById('notificationCount');
        const mobileCounter = document.getElementById('notificationCountMobile');
        
        if (counter) {
            counter.textContent = this.notificationCount || '';
            counter.classList.toggle('hidden', !this.notificationCount);
        }
        
        if (mobileCounter) {
            mobileCounter.textContent = this.notificationCount || '';
            mobileCounter.classList.toggle('hidden', !this.notificationCount);
        }
    }

    async createNotification(userId, type, data) {
        if (!userId) return;
        
        const notificationRef = ref(database, `notifications/${userId}`);
        await push(notificationRef, {
            type,
            data,
            timestamp: Date.now(),
            read: false
        });
    }

    async markAsRead(notificationId) {
        const notificationRef = ref(database, `notifications/${this.currentUser.uid}/${notificationId}`);
        await update(notificationRef, { read: true });
    }
}

export const notificationManager = new NotificationManager();
