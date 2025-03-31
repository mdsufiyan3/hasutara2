import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentReturns = [];

// Load returned orders from Firestore
async function loadReturnedOrders(statusFilter = 'all') {
    try {
        // First get all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        currentReturns = [];
        
        // Then get orders for each user
        for (const userDoc of usersSnapshot.docs) {
            const ordersRef = collection(db, 'users', userDoc.id, 'orders');
            // Query only returned orders
            const q = query(ordersRef, where("status", "==", "returned"));
            const ordersSnapshot = await getDocs(q);
            
            const returnedOrders = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                userId: userDoc.id,
                userName: userDoc.data().name || 'N/A',
                ...doc.data()
            }));
            
            currentReturns = [...currentReturns, ...returnedOrders];
        }

        updateReturnStats();
        displayReturns();
    } catch (error) {
        console.error('Error loading returned orders:', error);
        showNotification('Failed to load returned orders', 'error');
    }
}

// Display returns in table
function displayReturns(filteredReturns = currentReturns) {
    const tbody = document.getElementById('returnsTableBody');
    tbody.innerHTML = '';

    if (filteredReturns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-returns">
                    <i class="fas fa-box-open"></i>
                    <p>No returned orders found</p>
                </td>
            </tr>
        `;
        return;
    }

    filteredReturns.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.orderId || 'N/A'}</td>
            <td>${order.userName || order.customer?.name || 'N/A'}</td>
            <td>${new Date(order.returnDate || order.lastUpdated || order.createdAt).toLocaleDateString()}</td>
            <td>${order.returnReason || 'Not specified'}</td>
            <td>
                <span class="status-badge status-${order.returnStatus || 'pending'}">
                    ${order.returnStatus || 'pending'}
                </span>
            </td>
            <td>
                <button class="action-btn view-btn" onclick="viewReturnDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update return statistics
function updateReturnStats() {
    const stats = {
        pending: currentReturns.filter(r => r.returnStatus === 'pending').length,
        approved: currentReturns.filter(r => r.returnStatus === 'approved').length,
        rejected: currentReturns.filter(r => r.returnStatus === 'rejected').length,
        completed: currentReturns.filter(r => r.returnStatus === 'completed').length
    };

    document.getElementById('pendingReturnsCount').textContent = stats.pending;
    document.getElementById('approvedReturnsCount').textContent = stats.approved;
    document.getElementById('rejectedReturnsCount').textContent = stats.rejected;
    document.getElementById('completedReturnsCount').textContent = stats.completed;
}

// View return details
window.viewReturnDetails = (orderId) => {
    const order = currentReturns.find(o => o.id === orderId);
    if (!order) return;

    // Populate modal with return details
    document.getElementById('modalReturnId').textContent = order.id;
    document.getElementById('modalOrderId').textContent = order.orderId || 'N/A';
    document.getElementById('modalReturnDate').textContent = new Date(order.returnDate || order.lastUpdated).toLocaleDateString();
    document.getElementById('modalCustomerName').textContent = order.userName || order.customer?.name || 'N/A';
    document.getElementById('modalCustomerEmail').textContent = order.customer?.email || 'N/A';
    document.getElementById('modalCustomerPhone').textContent = order.customer?.phone || 'N/A';
    document.getElementById('modalReturnReason').textContent = order.returnReason || 'Not specified';

    // Display returned items
    const itemsList = document.getElementById('modalReturnItems');
    itemsList.innerHTML = '';

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.innerHTML = `
                <div class="item-image">
                    <img src="${item.image || '../../image/placeholder.jpg'}" 
                         alt="${item.name}"
                         onerror="this.src='../../image/placeholder.jpg'"
                         class="product-img">
                </div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">₹${item.price}</div>
                    <div class="item-quantity">Quantity: ${item.quantity}</div>
                    <div class="item-size">Size: ${item.size || 'N/A'}</div>
                </div>
            `;
            itemsList.appendChild(itemCard);
        });
    } else {
        itemsList.innerHTML = '<p class="no-items">No items found</p>';
    }

    // Show/hide action buttons based on current status
    const approveBtn = document.getElementById('approveReturn');
    const rejectBtn = document.getElementById('rejectReturn');
    const completeBtn = document.getElementById('completeReturn');

    if (order.returnStatus === 'pending') {
        approveBtn.style.display = 'block';
        rejectBtn.style.display = 'block';
        completeBtn.style.display = 'none';
    } else if (order.returnStatus === 'approved') {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        completeBtn.style.display = 'block';
    } else {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        completeBtn.style.display = 'none';
    }

    // Add status editing functionality
    const statusElement = document.getElementById('modalReturnStatus');
    const currentStatus = order.returnStatus || 'pending';
    
    statusElement.innerHTML = `
        <div class="status-wrapper">
            <span class="status-badge status-${currentStatus}">${currentStatus}</span>
            <button class="edit-status-btn" onclick="editReturnStatus('${order.id}')">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;

    // Show modal with flex display
    const modal = document.getElementById('returnDetailsModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'flex-start';
    modal.style.justifyContent = 'center';
};

// Add new function to edit return status
window.editReturnStatus = (orderId) => {
    const statusElement = document.getElementById('modalReturnStatus');
    const currentStatus = statusElement.querySelector('.status-badge').textContent;
    
    // Create status select dropdown
    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';
    statusSelect.innerHTML = `
        <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="approved" ${currentStatus === 'approved' ? 'selected' : ''}>Approved</option>
        <option value="rejected" ${currentStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
    `;

    // Create save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-status-btn';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';

    // Replace status display with edit controls
    statusElement.innerHTML = '';
    statusElement.appendChild(statusSelect);
    statusElement.appendChild(saveBtn);

    // Add save functionality
    saveBtn.onclick = async () => {
        const newStatus = statusSelect.value;
        try {
            const order = currentReturns.find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            const orderRef = doc(db, `users/${order.userId}/orders/${orderId}`);
            await updateDoc(orderRef, {
                returnStatus: newStatus,
                lastUpdated: new Date().toISOString()
            });

            // Update UI
            statusElement.innerHTML = `
                <div class="status-wrapper">
                    <span class="status-badge status-${newStatus}">${newStatus}</span>
                    <button class="edit-status-btn" onclick="editReturnStatus('${orderId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            `;

            // Show success notification
            showNotification('Return status updated successfully');

            // Refresh returns list and stats
            await loadReturnedOrders();

        } catch (error) {
            console.error('Error updating return status:', error);
            showNotification('Failed to update status', 'error');
        }
    };
};

// Initialize month and year selectors
function initializeMonthYearSelectors() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    
    // Add last 5 years
    for (let year = currentYear; year >= currentYear - 4; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Set current month and year as default
    document.getElementById('monthSelect').value = new Date().getMonth().toString();
    yearSelect.value = currentYear;
}

// Filter returns by month and year
function filterReturnsByMonthYear() {
    const selectedMonth = document.getElementById('monthSelect').value;
    const selectedYear = document.getElementById('yearSelect').value;
    
    let filteredReturns = currentReturns;

    if (selectedMonth !== 'all') {
        filteredReturns = filteredReturns.filter(order => {
            const returnDate = new Date(order.returnDate || order.lastUpdated || order.createdAt);
            return returnDate.getMonth() === parseInt(selectedMonth) && 
                   returnDate.getFullYear() === parseInt(selectedYear);
        });
    } else if (selectedYear) {
        filteredReturns = filteredReturns.filter(order => {
            const returnDate = new Date(order.returnDate || order.lastUpdated || order.createdAt);
            return returnDate.getFullYear() === parseInt(selectedYear);
        });
    }

    updateReturnStats();
    displayReturns(filteredReturns);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadReturnedOrders();

    // Search functionality
    document.getElementById('searchReturns').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredReturns = currentReturns.filter(order => 
            order.id.toLowerCase().includes(searchTerm) ||
            (order.userName || '').toLowerCase().includes(searchTerm) ||
            (order.customer?.name || '').toLowerCase().includes(searchTerm)
        );
        displayReturns(filteredReturns);
    });

    // Status filter
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        const status = e.target.value;
        const filteredReturns = status === 'all' 
            ? currentReturns 
            : currentReturns.filter(order => order.returnStatus === status);
        displayReturns(filteredReturns);
    });

    // Initialize and add month/year filter listeners
    initializeMonthYearSelectors();
    document.getElementById('monthSelect').addEventListener('change', filterReturnsByMonthYear);
    document.getElementById('yearSelect').addEventListener('change', filterReturnsByMonthYear);

    // Close modal
    document.querySelector('.close-btn').addEventListener('click', () => {
        const modal = document.getElementById('returnDetailsModal');
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('returnDetailsModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Action buttons
    document.getElementById('approveReturn').addEventListener('click', () => updateReturnStatus('approved'));
    document.getElementById('rejectReturn').addEventListener('click', () => updateReturnStatus('rejected'));
    document.getElementById('completeReturn').addEventListener('click', () => updateReturnStatus('completed'));
});

// Update return status
async function updateReturnStatus(newStatus) {
    const orderId = document.getElementById('modalReturnId').textContent;
    const order = currentReturns.find(o => o.id === orderId);
    
    if (!order) return;

    try {
        const orderRef = doc(db, `users/${order.userId}/orders/${order.id}`);
        await updateDoc(orderRef, {
            returnStatus: newStatus,
            lastUpdated: new Date().toISOString()
        });

        showNotification(`Return ${newStatus} successfully`);
        document.getElementById('returnDetailsModal').style.display = 'none';
        loadReturnedOrders();
    } catch (error) {
        console.error('Error updating return status:', error);
        showNotification('Failed to update return status', 'error');
    }
}

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Create container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);

    // Remove notification after animation
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}