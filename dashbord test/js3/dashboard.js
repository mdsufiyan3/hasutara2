import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit, addDoc, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize dashboard data
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDate();
    loadDashboardData();
    setupNotificationOverlay();
});

// Set current date
function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDate = new Date().toLocaleDateString('en-US', options);
    document.getElementById('currentDate').textContent = currentDate;
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUserStats(),
            loadOrderStats(),
            loadProductStats(),
            loadRecentOrders(),
            updateQuickActionBadges() // Add this line
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
    } catch (error) {
        console.error('Error loading user stats:', error);
        document.getElementById('totalUsers').textContent = 'Error';
    }
}

// Load order statistics
async function loadOrderStats() {
    try {
        let totalOrders = 0;
        let totalRevenue = 0;
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        for (const userDoc of usersSnapshot.docs) {
            const ordersSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'orders'));
            totalOrders += ordersSnapshot.size;
            
            ordersSnapshot.forEach(orderDoc => {
                const orderData = orderDoc.data();
                if (orderData.total) {
                    totalRevenue += parseFloat(orderData.total);
                }
            });
        }

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    } catch (error) {
        console.error('Error loading order stats:', error);
        document.getElementById('totalOrders').textContent = 'Error';
        document.getElementById('totalRevenue').textContent = 'Error';
    }
}

// Load product statistics
async function loadProductStats() {
    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        document.getElementById('totalProducts').textContent = productsSnapshot.size;
    } catch (error) {
        console.error('Error loading product stats:', error);
        document.getElementById('totalProducts').textContent = 'Error';
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const recentOrders = [];
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        for (const userDoc of usersSnapshot.docs) {
            const ordersQuery = query(
                collection(db, 'users', userDoc.id, 'orders'),
                orderBy('timestamp', 'desc'),
                limit(5)
            );
            
            const ordersSnapshot = await getDocs(ordersQuery);
            
            ordersSnapshot.forEach(orderDoc => {
                const orderData = orderDoc.data();
                recentOrders.push({
                    id: orderDoc.id,
                    userId: userDoc.id,
                    userName: orderData.customer?.name || 'Anonymous',
                    date: orderData.timestamp,
                    total: orderData.total || 0,
                    status: orderData.status || 'pending'
                });
            });
        }

        // Sort orders by date and take the 5 most recent
        const sortedOrders = recentOrders
            .sort((a, b) => b.date - a.date)
            .slice(0, 5);

        displayRecentOrders(sortedOrders);
    } catch (error) {
        console.error('Error loading recent orders:', error);
        showError('Failed to load recent orders');
    }
}

// Display recent orders in the table
function displayRecentOrders(orders) {
    const tableBody = document.getElementById('recentOrdersTable');
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-orders">No recent orders found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.userName}</td>
            <td>${formatDate(order.date)}</td>
            <td>₹${parseFloat(order.total).toLocaleString()}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        </tr>
    `).join('');
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.querySelector('.main-content').prepend(errorElement);
    
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

// Add event listeners for quick action buttons
document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        if (action) {
            handleQuickAction(action);
        }
    });
});

// Handle quick actions
function handleQuickAction(action) {
    switch(action) {
        case 'add-product':
            window.location.href = 'admin.html';
            break;
        case 'manage-orders':
            window.location.href = 'customer-orders.html';
            break;
        case 'view-users':
            window.location.href = 'users-data.html';
            break;
        case 'view-products':
            window.location.href = 'all-available-products.html';
            break;
    }
}

// Add real-time updates if needed
export function setupRealtimeUpdates() {
    // Add real-time listener code here if required
}

// Add new function to update Quick Action badges
async function updateQuickActionBadges() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let pendingOrders = 0;
        let newUsers = 0;
        let lowStockProducts = 0;

        // Count pending orders
        for (const userDoc of usersSnapshot.docs) {
            const ordersSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'orders'));
            ordersSnapshot.forEach(orderDoc => {
                if (orderDoc.data().status === 'pending') {
                    pendingOrders++;
                }
            });
        }

        // Count new users (registered in last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.createdAt && userData.createdAt.toDate() > oneDayAgo) {
                newUsers++;
            }
        });

        // Count low stock products (less than 10 items)
        const productsSnapshot = await getDocs(collection(db, 'products'));
        productsSnapshot.forEach(doc => {
            const productData = doc.data();
            if (productData.stock && productData.stock < 10) {
                lowStockProducts++;
            }
        });

        // Update badges
        document.getElementById('ordersBadge').textContent = pendingOrders || '';
        document.getElementById('usersBadge').textContent = newUsers || '';
        document.getElementById('productsBadge').textContent = lowStockProducts || '';
        document.getElementById('newProductsBadge').textContent = ''; // Optional: Add logic for new products

    } catch (error) {
        console.error('Error updating quick action badges:', error);
    }
}
