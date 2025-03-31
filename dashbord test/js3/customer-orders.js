import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentOrders = [];
let selectedOrderId = null;

// Show loading spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    document.body.appendChild(spinner);
}

// Hide loading spinner
function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Load orders from user's orders subcollection
async function loadOrders(statusFilter = 'all') {
    showLoadingSpinner();
    try {
        // First get all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        currentOrders = [];
        
        // Then get orders for each user
        for (const userDoc of usersSnapshot.docs) {
            const ordersRef = collection(db, 'users', userDoc.id, 'orders');
            const ordersSnapshot = await getDocs(ordersRef);
            
            const userOrders = ordersSnapshot.docs.map(doc => {
                const data = doc.data();
                // Calculate total price from cart items
                const totalPrice = data.cart ? data.cart.reduce((sum, item) => 
                    sum + (parseFloat(item.price) * item.quantity), 0) : 0;
                
                return {
                    id: doc.id,
                    userId: userDoc.id,
                    totalPrice: totalPrice,
                    ...data
                };
            });
            
            currentOrders = [...currentOrders, ...userOrders];
        }

        console.log('Loaded orders:', currentOrders); // Debug log
        displayOrders(statusFilter);
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Failed to load orders');
    } finally {
        hideLoadingSpinner();
    }
}

// Display orders
function displayOrders(statusFilter) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    // Get current month and year filters
    const selectedMonth = document.getElementById('monthSelect').value;
    const selectedYear = document.getElementById('yearSelect').value;

    let filteredOrders = currentOrders;

    // Apply month/year filter first
    if (selectedMonth !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp || order.orderDate);
            return orderDate.getMonth() === parseInt(selectedMonth) && 
                   orderDate.getFullYear() === parseInt(selectedYear);
        });
    } else if (selectedYear) {
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp || order.orderDate);
            return orderDate.getFullYear() === parseInt(selectedYear);
        });
    }

    // First update stats with all filtered orders before status filtering
    updateStatsDisplay(filteredOrders);

    // Then apply status filter if needed
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Update status counts for the filtered period
    const statusCounts = {
        pending: filteredOrders.filter(order => order.status === 'pending').length,
        processing: filteredOrders.filter(order => order.status === 'processing').length,
        shipped: filteredOrders.filter(order => order.status === 'shipped').length,
        delivered: filteredOrders.filter(order => order.status === 'delivered').length,
        cancelled: filteredOrders.filter(order => order.status === 'cancelled').length
    };

    // Update the stats displays
    document.getElementById('pendingCount').textContent = statusCounts.pending;
    document.getElementById('processingCount').textContent = statusCounts.processing;
    document.getElementById('shippedCount').textContent = statusCounts.shipped;
    document.getElementById('deliveredCount').textContent = statusCounts.delivered;
    document.getElementById('cancelledCount').textContent = statusCounts.cancelled;
    document.getElementById('totalCount').textContent = filteredOrders.length; // Add this line
    document.getElementById('totalOrderCount').textContent = filteredOrders.length;

    if (filteredOrders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">
                    <div class="no-orders">
                        <i class="fas fa-box-open"></i>
                        <p>No ${statusFilter === 'all' ? '' : statusFilter} orders found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filteredOrders.forEach(order => {
        // Get the order date from the order object
        const orderDate = order.orderDate || order.createdAt || order.timestamp;
        // Format the date properly
        const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString() : 'N/A';

        const isNewOrder = (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24) <= 1; // Check if the order is new (within 1 day)

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}${isNewOrder && order.status === 'pending' ? '<span class="new-tag">New</span>' : ''}</td>
            <td>${order.userId || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>₹${order.totalPrice.toFixed(2)}</td>
            <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// View order details
window.viewOrderDetails = (orderId) => {
    const order = currentOrders.find(order => order.id === orderId);
    if (order) {
        // Update modal content with order ID and date
        document.getElementById('modalOrderId').textContent = `# ${order.orderId || order.id}`;
        document.getElementById('modalOrderDate').textContent = new Date(order.createdAt || Date.now()).toLocaleDateString();

        // Update customer information from the customer object
        if (order.customer) {
            document.getElementById('modalCustomerName').textContent = order.customer.name || 'N/A';
            document.getElementById('modalCustomerEmail').textContent = order.customer.email || 'N/A';
            document.getElementById('modalCustomerPhone').textContent = order.customer.phone || 'N/A';
            document.getElementById('modalCustomerAddress').textContent = order.customer.address || 'N/A';
            document.getElementById('modalCustomerPincode').textContent = order.customer.pincode || 'N/A';
        } else {
            // Fallback if customer object doesn't exist
            document.getElementById('modalCustomerName').textContent = 'N/A';
            document.getElementById('modalCustomerEmail').textContent = 'N/A';
            document.getElementById('modalCustomerPhone').textContent = 'N/A';
            document.getElementById('modalCustomerAddress').textContent = 'N/A';
            document.getElementById('modalCustomerPincode').textContent = 'N/A';
        }

        // Update order status and payment information
        document.getElementById('modalOrderStatus').textContent = order.status || 'pending';
        document.getElementById('modalPaymentMethod').textContent = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment';
        
        // Update pricing information
        document.getElementById('modalOrderSubtotal').textContent = order.subtotal || '₹0.00';
        document.getElementById('modalOrderShipping').textContent = order.shipping || '₹0.00';
        document.getElementById('modalOrderTotal').textContent = order.total || '₹0.00';

        // Display order items
        const itemsList = document.getElementById('orderItemsList');
        itemsList.innerHTML = '';

        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                console.log('Item image URL:', item.image); // Log image URL
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
                        <div class="payment-method">
                            <span class="cod-badge">${order.paymentMethod === 'cod' ? 'COD' : 'ONLINE'}</span>
                            <span class="status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span>
                        </div>
                    </div>
                `;
                itemsList.appendChild(itemCard);
            });
        } else {
            itemsList.innerHTML = '<p class="no-items">No items in this order</p>';
        }

        // Update status display with edit icon for all statuses
        const statusElement = document.getElementById('modalOrderStatus');
        const currentStatus = order.status || 'pending';
        
        statusElement.innerHTML = `
            <span class="status-badge status-${currentStatus}">${currentStatus}</span>
            <button class="edit-status-btn" onclick="editStatus('${order.id}')">
                <i class="fas fa-edit"></i>
            </button>
        `;

        // Show modal
        document.getElementById('orderDetailsModal').style.display = 'flex';
    }
};

// Close modal
window.closeOrderModal = () => {
    document.getElementById('orderDetailsModal').style.display = 'none';
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const currentDateElement = document.getElementById('currentDate');
    const orderDateInput = document.getElementById('orderDate');

    // Set initial date
    const currentDate = new Date().toLocaleDateString();
    currentDateElement.textContent = currentDate;
    orderDateInput.value = new Date().toISOString().split('T')[0];

    // Update displayed date and total orders when a new date is selected
    orderDateInput.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        currentDateElement.textContent = selectedDate.toLocaleDateString();
        filterOrdersByDate(selectedDate);
    });

    loadOrders();

    // Add status filter functionality
    const statusButtons = document.querySelectorAll('.status-btn');
    
    statusButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            statusButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Filter orders by status
            filterOrdersByMonthYear(); // Use this instead of loadOrders
        });
    });

    initializeMonthYearSelectors();

    // Update month/year filter event listeners
    document.getElementById('monthSelect').addEventListener('change', () => {
        filterOrdersByMonthYear();
    });
    
    document.getElementById('yearSelect').addEventListener('change', () => {
        filterOrdersByMonthYear();
    });

    // Add month selector toggle functionality
    const monthSelectorToggle = document.getElementById('monthSelectorToggle');
    const monthSelector = document.getElementById('monthSelector');
    const dateFilter = document.querySelector('.date-filter');
    const checkbox = monthSelectorToggle.querySelector('.checkbox');
    
    monthSelectorToggle.addEventListener('click', () => {
        checkbox.classList.toggle('checked');
        monthSelector.classList.toggle('hidden');
        dateFilter.classList.toggle('hidden'); // Toggle date filter visibility
        
        // If hiding the selector, reset to default view
        if (monthSelector.classList.contains('hidden')) {
            document.getElementById('monthSelect').value = 'all';
            document.getElementById('yearSelect').value = new Date().getFullYear();
            document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
            filterOrdersByMonthYear(); // Reset the orders display
        }
    });
});

// Function to filter orders by date
function filterOrdersByDate(selectedDate) {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const filteredOrders = currentOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.timestamp || order.orderDate)
            .toISOString().split('T')[0];
        return orderDate === selectedDateStr;
    });
    
    updateStatsDisplay(filteredOrders);
    displayFilteredOrders(filteredOrders);
}

// Function to display filtered orders
function displayFilteredOrders(filteredOrders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    // Update total order count
    document.getElementById('totalOrderCount').textContent = filteredOrders.length;

    if (filteredOrders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">
                    <div class="no-orders">
                        <i class="fas fa-box-open"></i>
                        <p>No orders found for the selected date</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filteredOrders.forEach(order => {
        // Format the date properly
        const orderDate = order.createdAt || order.timestamp || order.orderDate;
        const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';

        const isNewOrder = (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24) <= 1; // Check if the order is new (within 1 day)

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}${isNewOrder ? '<span class="new-tag">New</span>' : ''}</td>
            <td>${order.userId || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>₹${order.totalPrice.toFixed(2)}</td>
            <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// Add notification styles first
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
    }
    
    .notification {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 25px;
        margin-bottom: 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.5s ease-out;
    }
    
    .notification.success {
        background: rgba(76, 175, 80, 0.9);
        border-left: 4px solid #2e7d32;
    }
    
    .notification.error {
        background: rgba(244, 67, 54, 0.9);
        border-left: 4px solid #c62828;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Create notification container
const notificationContainer = document.createElement('div');
notificationContainer.className = 'notification-container';
document.body.appendChild(notificationContainer);

// Enhanced showNotification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    notificationContainer.appendChild(notification);

    // Remove notification after animation
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Update the status update function
window.editStatus = async (orderId) => {
    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';
    statusSelect.innerHTML = `
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
    `;

    const statusElement = document.getElementById('modalOrderStatus');
    const currentStatus = statusElement.querySelector('.status-badge').textContent;
    statusSelect.value = currentStatus;

    statusElement.innerHTML = '';
    statusElement.appendChild(statusSelect);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-status-btn';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    statusElement.appendChild(saveBtn);

    saveBtn.onclick = async () => {
        const newStatus = statusSelect.value;
        try {
            const order = currentOrders.find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            const orderRef = doc(db, `users/${order.userId}/orders/${orderId}`);
            
            // Update the order status
            await updateDoc(orderRef, { 
                status: newStatus,
                lastUpdated: new Date().toISOString()
            });

            // Update UI
            statusElement.innerHTML = `
                <span class="status-badge status-${newStatus}">${newStatus}</span>
                <button class="edit-status-btn" onclick="editStatus('${orderId}')">
                    <i class="fas fa-edit"></i>
                </button>
            `;

            // Refresh orders list
            await loadOrders(document.querySelector('.status-btn.active').dataset.status);

            // Show success notification
            showNotification('Order status updated successfully! 🎉');

        } catch (error) {
            console.error('Error updating status:', error);
            showNotification('Failed to update status. Please try again.', 'error');
        }
    };
};

// When saving an order, make sure to include the order date
async function saveOrder(orderData) {
    try {
        const orderRef = doc(db, `users/${orderData.userId}/orders/${orderData.id}`);
        await updateDoc(orderRef, {
            ...orderData,
            orderDate: orderData.orderDate || new Date().toISOString() // Ensure order date is saved
        });
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

// Function to search orders by customer name or order ID
function searchOrders(query) {
    const lowerCaseQuery = query.toLowerCase();
    const filteredOrders = currentOrders.filter(order => 
        (order.customer && order.customer.name.toLowerCase().includes(lowerCaseQuery)) ||
        order.id.toLowerCase().includes(lowerCaseQuery)
    );
    
    updateStatsDisplay(filteredOrders);
    displayFilteredOrders(filteredOrders);
}

// Event listener for search input
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchOrders(e.target.value);
});

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
    const currentMonth = new Date().getMonth();
    document.getElementById('monthSelect').value = currentMonth;
    yearSelect.value = currentYear;

    // Add event listeners
    document.getElementById('monthSelect').addEventListener('change', filterOrdersByMonthYear);
    yearSelect.addEventListener('change', filterOrdersByMonthYear);
}

// Filter orders by selected month and year
function filterOrdersByMonthYear() {
    const selectedMonth = document.getElementById('monthSelect').value;
    const selectedYear = document.getElementById('yearSelect').value;
    const statusFilter = document.querySelector('.status-btn.active').dataset.status;

    let filteredOrders = currentOrders;

    if (selectedMonth !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp || order.orderDate);
            return orderDate.getMonth() === parseInt(selectedMonth) && 
                   orderDate.getFullYear() === parseInt(selectedYear);
        });
    } else if (selectedYear) {
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp || order.orderDate);
            return orderDate.getFullYear() === parseInt(selectedYear);
        });
    }

    // First update stats with all filtered orders
    updateStatsDisplay(filteredOrders);

    // Then apply status filter for display if needed
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    displayFilteredOrders(filteredOrders);
}

// Add new function to update stats display
function updateStatsDisplay(orders) {
    const statusCounts = {
        pending: orders.filter(order => order.status === 'pending').length,
        processing: orders.filter(order => order.status === 'processing').length,
        shipped: orders.filter(order => order.status === 'shipped').length,
        delivered: orders.filter(order => order.status === 'delivered').length,
        cancelled: orders.filter(order => order.status === 'cancelled').length,
        returned: orders.filter(order => order.status === 'returned').length
    };

    // Calculate analytics (e.g., total value of orders)
    const analyticsCount = orders.reduce((total, order) => total + (order.totalPrice || 0), 0);

    // Update all stats displays
    document.getElementById('totalCount').textContent = orders.length;
    document.getElementById('analyticsCount').textContent = '₹' + analyticsCount.toFixed(2);
    document.getElementById('returnsCount').textContent = statusCounts.returned;
    document.getElementById('pendingCount').textContent = statusCounts.pending;
    document.getElementById('processingCount').textContent = statusCounts.processing;
    document.getElementById('shippedCount').textContent = statusCounts.shipped;
    document.getElementById('deliveredCount').textContent = statusCounts.delivered;
    document.getElementById('cancelledCount').textContent = statusCounts.cancelled;
    document.getElementById('totalOrderCount').textContent = orders.length;
}