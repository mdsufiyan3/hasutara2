import { getNotifications, markNotificationAsRead, deleteNotification } from './firebase-utils.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.currentFilter = 'all';
        this.container = document.querySelector('.notifications-list');
        this.noNotificationsElement = document.querySelector('.no-notifications');
        this.userId = localStorage.getItem('userEmail');
        
        // Add debug logs
        console.log('NotificationManager initialized');
        console.log('User ID:', this.userId);
        
        this.initializeEventListeners();
        this.loadNotifications();
    }

    initializeEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterNotifications(btn.dataset.filter));
        });

        // Mark all as read
        document.getElementById('markAllRead').addEventListener('click', () => this.markAllAsRead());

        // Removed clear all event listener
    }

    async loadNotifications() {
        try {
            if (!this.userId) {
                console.error('No user ID found');
                throw new Error('User not authenticated');
            }
            
            console.log('Loading notifications for user:', this.userId);
            this.notifications = await getNotifications(this.userId);
            console.log('Loaded notifications:', this.notifications);
            
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showError('Failed to load notifications');
        }
    }

    showError(message) {
        // Add error display to the UI
        const errorDiv = document.createElement('div');
        errorDiv.className = 'notification-error';
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
    }

    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    filterNotifications(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.renderNotifications();
    }

    renderNotifications() {
        let filteredNotifications = this.notifications;

        // Apply filters
        if (this.currentFilter !== 'all') {
            filteredNotifications = this.notifications.filter(notif => {
                if (this.currentFilter === 'unread') return !notif.read;
                return notif.category === this.currentFilter;
            });
        }

        // Sort by timestamp
        filteredNotifications.sort((a, b) => b.timestamp - a.timestamp);

        // Group by date
        const grouped = this.groupByDate(filteredNotifications);

        // Clear container
        this.container.innerHTML = '';

        // Show/hide no notifications message
        this.noNotificationsElement.classList.toggle('hidden', filteredNotifications.length > 0);

        // Render groups
        for (const [date, notifications] of Object.entries(grouped)) {
            this.renderDateGroup(date, notifications);
        }
    }

    groupByDate(notifications) {
        const groups = {};
        
        notifications.forEach(notif => {
            const date = new Date(notif.timestamp).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(notif);
        });

        return groups;
    }

    renderDateGroup(date, notifications) {
        const groupElement = document.createElement('div');
        groupElement.className = 'notification-group';
        
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'notification-date';
        dateHeader.textContent = this.formatDate(date);
        groupElement.appendChild(dateHeader);

        notifications.forEach(notif => {
            groupElement.appendChild(this.createNotificationElement(notif));
        });

        this.container.appendChild(groupElement);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification-item ${notification.read ? '' : 'unread'}`;
        
        // Enhanced template for order notifications
        const isOrderNotification = notification.category === 'orders';
        const orderDetails = notification.orderDetails || {};
        
        element.innerHTML = `
            <div class="notification-icon ${notification.type}">
                <i class="fas ${this.getIconForType(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">
                    ${notification.message}
                    ${isOrderNotification ? `
                        <div class="order-details">
                            <div class="order-items">
                                <p><strong>Total:</strong> ${orderDetails.total}</p>
                                <p><strong>Payment:</strong> ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                                <p><strong>Items:</strong> ${orderDetails.items ? orderDetails.items.length : 0} items</p>
                            </div>
                            <div class="order-actions">
                                <a href="orders.html?id=${orderDetails.orderId}" class="view-order">
                                    View Order Details <i class="fas fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="notification-time">
                    <i class="far fa-clock"></i>
                    ${this.formatTimestamp(notification.timestamp)}
                </div>
            </div>
            <div class="notification-actions">
                ${notification.read ? '' : `
                    <button class="notification-action-btn mark-read" title="Mark as read">
                        <i class="fas fa-check"></i>
                    </button>
                `}
                <button class="notification-action-btn delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add event listeners
        const markReadBtn = element.querySelector('.mark-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', () => this.markAsRead(notification.id));
        }

        element.querySelector('.delete').addEventListener('click', 
            () => this.deleteNotification(notification.id));

        return element;
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateString === now.toLocaleDateString()) return 'Today';
        if (dateString === yesterday.toLocaleDateString()) return 'Yesterday';
        return dateString;
    }

    async markAsRead(id) {
        try {
            await markNotificationAsRead(this.userId, id);
            const notification = this.notifications.find(n => n.id === id);
            if (notification) {
                notification.read = true;
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const promises = this.notifications
                .filter(n => !n.read)
                .map(n => markNotificationAsRead(this.userId, n.id));
            
            await Promise.all(promises);
            this.notifications.forEach(n => n.read = true);
            this.renderNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    async deleteNotification(id) {
        try {
            await deleteNotification(this.userId, id);
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.renderNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }
}

// Initialize the notification manager
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing NotificationManager');
    new NotificationManager();
});