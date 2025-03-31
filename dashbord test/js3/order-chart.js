import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let ordersChart, statusChart, revenueChart;

// Show loading indicator
function showLoading() {
    const charts = document.querySelectorAll('.chart-card');
    charts.forEach(chart => {
        chart.classList.add('loading');
    });
}

// Hide loading indicator
function hideLoading() {
    const charts = document.querySelectorAll('.chart-card');
    charts.forEach(chart => {
        chart.classList.remove('loading');
    });
}

async function fetchOrderData(timeRange = 'all') {
    try {
        showLoading();
        const startDate = new Date();
        let endDate = new Date();

        if (timeRange === 'all') {
            startDate.setFullYear(startDate.getFullYear() - 1); // Show last year's data
        } else if (isNaN(timeRange)) {
            const months = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };
            
            const currentYear = startDate.getFullYear();
            const selectedMonth = months[timeRange];
            
            if (selectedMonth !== undefined) {
                startDate.setFullYear(currentYear, selectedMonth, 1);
                endDate.setFullYear(currentYear, selectedMonth + 1, 0);
            }
        } else {
            // Handle day-based ranges
            startDate.setDate(startDate.getDate() - parseInt(timeRange));
        }
        
        const orders = [];
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        for (const userDoc of usersSnapshot.docs) {
            const ordersRef = collection(db, 'users', userDoc.id, 'orders');
            const ordersSnapshot = await getDocs(ordersRef);
            
            ordersSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const orderDate = new Date(data.createdAt);
                
                // Check if order is within the selected date range
                if ((isNaN(timeRange) && orderDate >= startDate && orderDate <= endDate) ||
                    (!isNaN(timeRange) && orderDate >= startDate)) {
                    const totalPrice = data.cart ? data.cart.reduce((sum, item) => 
                        sum + (parseFloat(item.price) * item.quantity), 0) : 0;

                    orders.push({
                        ...data,
                        id: doc.id,
                        userId: userDoc.id,
                        totalPrice: totalPrice
                    });
                }
            });
        }

        return orders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

function initializeCharts() {
    // Orders Chart
    const ordersCtx = document.getElementById('ordersChart').getContext('2d');
    ordersChart = new Chart(ordersCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Orders',
                data: [],
                borderColor: '#6B7FD7',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(107, 127, 215, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });

    // Status Chart with improved visuals
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#ffd700', '#1e90ff', '#9932cc', '#32cd32', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#fff' }
                }
            }
        }
    });

    // Revenue Chart with currency formatting
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Revenue (₹)',
                data: [],
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#fff' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff',
                        callback: value => '₹' + value.toLocaleString('en-IN')
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

// Fix getTopProducts function - remove async since we don't need it
function getTopProducts(orders) {
    try {
        const productMap = new Map();

        orders.forEach(order => {
            // Try to get items from both cart and items arrays
            const items = order.cart || order.items || [];
            
            if (Array.isArray(items)) {
                items.forEach(item => {
                    // Use productId or name as unique identifier
                    const key = item.productId || item.name;
                    
                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            name: item.name || 'Unknown Product',
                            image: item.image || item.productImage, // Try both image properties
                            productId: item.productId,
                            totalQuantity: 0,
                            totalRevenue: 0,
                            orders: 0
                        });
                    }

                    const product = productMap.get(key);
                    const quantity = parseInt(item.quantity) || 1;
                    const price = parseFloat(item.price) || 0;

                    product.totalQuantity += quantity;
                    product.totalRevenue += price * quantity;
                    product.orders += 1;

                    // Update product details if they were empty
                    if (!product.image && item.image) product.image = item.image;
                    if (!product.name && item.name) product.name = item.name;
                });
            }
        });

        console.log('Product Map:', Array.from(productMap.entries())); // Debug log

        const sortedProducts = Array.from(productMap.values())
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 5);

        console.log('Top 5 Products:', sortedProducts); // Debug log
        return sortedProducts;
    } catch (error) {
        console.error('Error processing top products:', error);
        return [];
    }
}

function updateCharts(orders) {
    // Group orders by date
    const dateGroups = orders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = {
                count: 0,
                revenue: 0
            };
        }
        acc[date].count++;
        acc[date].revenue += order.totalPrice || 0;
        return acc;
    }, {});

    // Count order statuses
    const statusCounts = orders.reduce((acc, order) => {
        const status = order.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
    });

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingDelivery = orders.filter(order => 
        ['pending', 'processing', 'shipped'].includes(order.status)
    ).length;

    // Update charts
    ordersChart.data.labels = Object.keys(dateGroups);
    ordersChart.data.datasets[0].data = Object.values(dateGroups).map(g => g.count);
    ordersChart.update();

    statusChart.data.datasets[0].data = [
        statusCounts.pending,
        statusCounts.processing,
        statusCounts.shipped,
        statusCounts.delivered,
        statusCounts.cancelled
    ];
    statusChart.update();

    revenueChart.data.labels = Object.keys(dateGroups);
    revenueChart.data.datasets[0].data = Object.values(dateGroups).map(g => g.revenue);
    revenueChart.update();

    // Update stats cards
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalRevenue').textContent = 
        '₹' + totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    document.getElementById('pendingDelivery').textContent = pendingDelivery;

    // Update top products - Add error handling
    try {
        const topProducts = getTopProducts(orders);
        const productsList = document.getElementById('topProducts');
        
        if (!topProducts || topProducts.length === 0) {
            productsList.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <p>No product data available</p>
                    <small>Debug info: ${orders.length} orders found</small>
                </div>`;
            return;
        }

        productsList.innerHTML = topProducts.map((product, index) => `
            <div class="product-item">
                <div class="product-rank">#${index + 1}</div>
                <img src="${product.image || '../../image/placeholder.jpg'}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="this.src='../../image/placeholder.jpg'">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-stats">
                        <span><i class="fas fa-box"></i> ${product.totalQuantity} sold</span>
                        <span><i class="fas fa-rupee-sign"></i> ${product.totalRevenue.toLocaleString('en-IN')}</span>
                        <span><i class="fas fa-shopping-cart"></i> ${product.orders} orders</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating top products:', error);
        document.getElementById('topProducts').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load top products</p>
                <small>Error: ${error.message}</small>
            </div>`;
    }
}

function populateMonthSelector() {
    const monthSelector = document.getElementById('monthSelector');
    const currentYear = new Date().getFullYear();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Keep the "All Time" option
    monthSelector.innerHTML = '<option value="all">All Time</option>';
    
    // Add months with year
    months.forEach((month, index) => {
        const monthValue = month.slice(0, 3).toLowerCase();
        monthSelector.innerHTML += `
            <option value="${monthValue}">${month} ${currentYear}</option>
        `;
    });
}

async function initializeAnalytics() {
    try {
        populateMonthSelector(); // Add this line
        initializeCharts();
        const orders = await fetchOrderData('all');
        updateCharts(orders);

        // Add month selector event listener
        document.getElementById('monthSelector').addEventListener('change', async (e) => {
            try {
                const selectedMonth = e.target.value;
                // Store selected month in localStorage
                localStorage.setItem('selectedMonth', selectedMonth);
                
                const orders = await fetchOrderData(selectedMonth);
                updateCharts(orders);
            } catch (error) {
                console.error('Error updating charts:', error);
                alert('Failed to update analytics. Please try again.');
            }
        });

        // Set month selector to previously selected month if exists
        const savedMonth = localStorage.getItem('selectedMonth');
        if (savedMonth) {
            document.getElementById('monthSelector').value = savedMonth;
        }
    } catch (error) {
        console.error('Error initializing analytics:', error);
        alert('Failed to load analytics. Please refresh the page.');
    }
}

document.addEventListener('DOMContentLoaded', initializeAnalytics);
