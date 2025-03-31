document.addEventListener('DOMContentLoaded', function() {
    // Add menu functionality
    const menuIcon = document.querySelector('.menu-icon');
    const menuOverlay = document.querySelector('.menu-overlay');
    const menuCloseBtn = document.querySelector('.menu-close-btn');
    
    if (menuIcon && menuOverlay) {
        menuIcon.addEventListener('click', function() {
            this.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            document.body.style.overflow = menuOverlay.classList.contains('active') ? 'hidden' : '';
        });

        if (menuCloseBtn) {
            menuCloseBtn.addEventListener('click', () => {
                menuIcon.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close menu when clicking outside
        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) {
                menuIcon.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuOverlay.classList.contains('active')) {
                menuIcon.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // ...existing code...
});

import { loadOrders, saveReview, saveProductReview, cancelOrder, returnOrder } from './firebase-utils.js';

document.addEventListener('DOMContentLoaded', async function() {
    const userId = localStorage.getItem('userEmail');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Show loading spinner
    const ordersContainer = document.querySelector('.orders-container');
    const loadingSpinner = document.getElementById('loadingSpinner');
    ordersContainer.classList.add('loading');
    loadingSpinner.classList.add('active');

    // Load orders from Firebase
    let orders = [];
    try {
        orders = await loadOrders(userId);
        console.log('Loaded orders:', orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    } finally {
        // Hide loading spinner
        ordersContainer.classList.remove('loading');
        loadingSpinner.classList.remove('active');
    }

    // Function to display orders
    function displayOrders(status = 'all') {
        const ordersList = document.getElementById('ordersList');
        
        // Add validation to filter out invalid orders
        const validOrders = orders.filter(order => {
            return order.orderId && 
                   order.createdAt && 
                   order.items && 
                   Array.isArray(order.items) &&
                   order.total &&
                   order.status;
        });

        const filteredOrders = status === 'all' 
            ? validOrders 
            : validOrders.filter(order => order.status === status);

        if (filteredOrders.length === 0) {
            ordersList.innerHTML = '<div class="no-orders">No orders found</div>';
            return;
        }

        ordersList.innerHTML = filteredOrders.map(order => `
            <div class="order-card">
                <div class="order-id-section">
                    <div class="order-id-label">
                        <i class="fas fa-hashtag"></i>
                        <span class="order-id">${order.orderId}</span>
                    </div>
                    <div class="order-date">
                        <i class="far fa-calendar-alt"></i>
                        <span>${formatDate(order.createdAt)}</span>
                    </div>
                </div>

                <!-- Modify shipping info section to add view details button -->
                <div class="shipping-info-section">
                    <div class="shipping-header">
                        <h3>Shipping Information</h3>
                        <button class="view-shipping-btn" data-order-id="${order.orderId}">
                            <i class="fas fa-expand-alt"></i> View Details
                        </button>
                    </div>
                    <div class="shipping-preview">
                        <p><strong>Name:</strong> ${order.customer?.name || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${order.customer?.phone || 'N/A'}</p>
                    </div>
                </div>

                <!-- Add shipping info overlay -->
                <div class="shipping-overlay" id="shipping-overlay-${order.orderId}">
                    <div class="shipping-overlay-content">
                        <button class="close-overlay">×</button>
                        <h2>Order Details</h2>
                        <div class="shipping-details-full">
                            <!-- Add payment method section first -->
                            <div class="detail-group payment-method">
                                <i class="fas fa-credit-card"></i>
                                <div>
                                    <h4>Payment Method</h4>
                                    <p>${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                                    <span class="payment-status ${order.paymentStatus || 'pending'}">
                                        ${order.paymentStatus || 'Pending'}
                                    </span>
                                </div>
                            </div>

                            <!-- Existing shipping details -->
                            <div class="detail-group">
                                <i class="fas fa-user"></i>
                                <div>
                                    <h4>Name</h4>
                                    <p>${order.customer?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="detail-group">
                                <i class="fas fa-envelope"></i>
                                <div>
                                    <h4>Email</h4>
                                    <p>${order.customer?.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="detail-group">
                                <i class="fas fa-phone"></i>
                                <div>
                                    <h4>Phone</h4>
                                    <p>${order.customer?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="detail-group">
                                <i class="fas fa-map-marker-alt"></i>
                                <div>
                                    <h4>Address</h4>
                                    <p>${order.customer?.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="detail-group">
                                <i class="fas fa-map-pin"></i>
                                <div>
                                    <h4>Pincode</h4>
                                    <p>${order.customer?.pincode || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <!-- Add Cancel/Return Order button in overlay -->
                        ${order.status !== 'cancelled' ? `
                            <button class="cancel-order-btn" data-order-id="${order.orderId}">
                                ${order.status === 'delivered' ? 'Return Order' : 'Cancel Order'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.image || ''}" alt="${item.name}" class="item-image">
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                <div class="item-specs">
                                    <span class="item-size">${item.size || 'M'}</span>
                                </div>
                                <div class="item-quantity">Qty: ${item.quantity}</div>
                                <div class="item-price">${item.price}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <div class="order-total">Total: ${order.total}</div>
                    <div class="status-controls">
                        <span class="status-indicator status-${order.status}">
                            <i class="fas fa-circle"></i>
                            ${order.status}
                        </span>
                    </div>
                </div>
                ${order.status === 'delivered' ? `
                    <div class="review-section ${order.reviewed ? 'reviewed' : ''}">
                        ${order.reviewed ? `
                            <div class="review-content">
                                <div class="review-rating">
                                    ${generateStars(order.rating)}
                                </div>
                                ${order.reviewImage ? `
                                    <div class="review-image">
                                        <img src="${order.reviewImage}" alt="Review image">
                                    </div>
                                ` : ''}
                                <p class="review-text">${order.review}</p>
                                <span class="review-date">Reviewed on ${formatDate(order.reviewDate)}</span>
                            </div>
                        ` : `
                            <div class="review-form" data-order-id="${order.orderId}" data-product-id="${order.items[0].id}">
                                <h4>Write a Review for ${order.items[0].name || 'this product'}</h4>
                                <input type="hidden" class="product-info" 
                                    data-product-title="${order.items[0].name}"
                                    data-product-id="${order.items[0].id}">
                                <div class="rating-input">
                                    <span>Rating:</span>
                                    <div class="star-rating" data-order-id="${order.orderId}">
                                        <i class="far fa-star" data-rating="1"></i>
                                        <i class="far fa-star" data-rating="2"></i>
                                        <i class="far fa-star" data-rating="3"></i>
                                        <i class="far fa-star" data-rating="4"></i>
                                        <i class="far fa-star" data-rating="5"></i>
                                    </div>
                                </div>
                                <div class="review-image-upload">
                                    <label for="review-image-${order.orderId}" class="image-upload-label">
                                        <i class="fas fa-camera"></i>
                                        <span>Add Photo</span>
                                    </label>
                                    <input type="file" 
                                        id="review-image-${order.orderId}" 
                                        class="review-image-input" 
                                        accept="image/*"
                                        data-order-id="${order.orderId}">
                                    <div class="image-preview" id="image-preview-${order.orderId}"></div>
                                </div>
                                <textarea 
                                    placeholder="Share your experience with this product..." 
                                    class="review-textarea"
                                    data-order-id="${order.orderId}"
                                ></textarea>
                                <button class="submit-review-btn" data-order-id="${order.orderId}">
                                    Submit Review
                                </button>
                            </div>
                        `}
                    </div>
                ` : ''}
                ${order.status === 'returned' ? `
                    <div class="return-status">
                        <span class="status-indicator status-returned">
                            <i class="fas fa-undo-alt"></i>
                            Returned
                        </span>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Add image upload preview functionality
        document.querySelectorAll('.review-image-input').forEach(input => {
            input.addEventListener('change', handleImagePreview);
        });

        // Add event listeners for review functionality
        document.querySelectorAll('.star-rating').forEach(ratingContainer => {
            const stars = ratingContainer.querySelectorAll('i');
            stars.forEach(star => {
                star.addEventListener('click', () => handleStarClick(star, stars));
                star.addEventListener('mouseover', () => handleStarHover(star, stars));
                star.addEventListener('mouseout', () => resetStars(stars, ratingContainer.dataset.rating));
            });
        });

        document.querySelectorAll('.submit-review-btn').forEach(btn => {
            btn.addEventListener('click', handleReviewSubmit);
        });

        // Add event listeners for shipping overlay
        document.querySelectorAll('.view-shipping-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('.view-shipping-btn').dataset.orderId;
                const overlay = document.getElementById(`shipping-overlay-${orderId}`);
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        document.querySelectorAll('.close-overlay').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const overlay = e.target.closest('.shipping-overlay');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        document.querySelectorAll('.shipping-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Add event listeners for Cancel/Return Order buttons
        document.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.addEventListener('click', showCancelConfirmation);
        });

        // Add event listener for Return Order buttons
        document.querySelectorAll('.return-order-btn').forEach(btn => {
            btn.addEventListener('click', showReturnConfirmation);
        });

        // Update order count
        document.querySelector('.order-count span').textContent = filteredOrders.length;
    }

    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    function generateStars(rating) {
        return Array(5).fill().map((_, index) => 
            `<i class="${index < rating ? 'fas' : 'far'} fa-star"></i>`
        ).join('');
    }

    function handleStarClick(clickedStar, stars) {
        const rating = clickedStar.dataset.rating;
        const container = clickedStar.closest('.star-rating');
        container.dataset.rating = rating;
        updateStars(stars, rating);
    }

    function handleStarHover(hoveredStar, stars) {
        const rating = hoveredStar.dataset.rating;
        updateStars(stars, rating);
    }

    function resetStars(stars, savedRating) {
        updateStars(stars, savedRating || 0);
    }

    function updateStars(stars, rating) {
        stars.forEach(star => {
            const starRating = star.dataset.rating;
            star.classList.toggle('fas', starRating <= rating);
            star.classList.toggle('far', starRating > rating);
        });
    }

    function handleImagePreview(event) {
        const file = event.target.files[0];
        const orderId = event.target.dataset.orderId;
        const previewDiv = document.getElementById(`image-preview-${orderId}`);
    
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewDiv.innerHTML = `
                    <div class="preview-container">
                        <img src="${e.target.result}" alt="Review preview">
                        <button class="remove-image" onclick="removePreviewImage('${orderId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Add this function to window scope for the remove button
    window.removePreviewImage = function(orderId) {
        const previewDiv = document.getElementById(`image-preview-${orderId}`);
        const input = document.querySelector(`#review-image-${orderId}`);
        previewDiv.innerHTML = '';
        input.value = '';
    };

    async function handleReviewSubmit(event) {
        const btn = event.target;
        btn.disabled = true;
    
        try {
            const reviewForm = btn.closest('.review-form');
            const orderId = reviewForm.dataset.orderId;
            const productId = reviewForm.dataset.productId;
            const userId = localStorage.getItem('userEmail');
    
            console.log('Starting review submission:', { orderId, productId, userId });
    
            if (!userId) {
                throw new Error('Please login to submit a review');
            }
    
            if (!productId) {
                throw new Error('Product ID is missing');
            }
    
            if (!orderId) {
                throw new Error('Order ID is missing');
            }
    
            const rating = parseInt(reviewForm.querySelector('.star-rating').dataset.rating);
            const reviewText = reviewForm.querySelector('.review-textarea').value.trim();
            
            if (!rating || rating < 1 || rating > 5) {
                throw new Error('Please select a rating between 1 and 5 stars');
            }
    
            if (!reviewText) {
                throw new Error('Please write your review text');
            }
    
            const reviewData = {
                userId,
                orderId,
                productId,
                rating,
                review: reviewText,
                userName: localStorage.getItem('userName') || 'Anonymous',
                verified: true,
                createdAt: new Date().toISOString()
            };
    
            console.log('Submitting review data:', reviewData);
            const reviewId = await saveProductReview(productId, reviewData);
            console.log('Review submitted successfully, ID:', reviewId);
    
            reviewForm.innerHTML = `
                <div class="review-success">
                    <i class="fas fa-check-circle"></i>
                    <p>Review submitted successfully!</p>
                </div>`;
    
        } catch (error) {
            console.error('Detailed review submission error:', {
                error: error.message,
                stack: error.stack
            });
            alert(error.message || 'Failed to submit review. Please try again.');
        } finally {
            btn.disabled = false;
        }
    }

    function showCancelConfirmation(event) {
        const btn = event.target;
        const orderId = btn.dataset.orderId;
        const confirmationOverlay = document.createElement('div');
        confirmationOverlay.classList.add('confirmation-overlay');
        confirmationOverlay.innerHTML = `
            <div class="confirmation-content">
                <p>Are you sure you want to ${btn.textContent.toLowerCase()}?</p>
                <button class="confirm-cancel-btn" data-order-id="${orderId}">Yes, ${btn.textContent}</button>
                <button class="close-confirmation-overlay">No, Go Back</button>
            </div>
        `;
        document.body.appendChild(confirmationOverlay);
        document.body.style.overflow = 'hidden';

        document.querySelector('.confirm-cancel-btn').addEventListener('click', handleCancelOrder);
        document.querySelector('.close-confirmation-overlay').addEventListener('click', () => {
            document.body.removeChild(confirmationOverlay);
            document.body.style.overflow = '';
        });
    }

    async function handleCancelOrder(event) {
        const btn = event.target;
        const orderId = btn.dataset.orderId;
        const userId = localStorage.getItem('userEmail'); // Move this line to the top
        const order = orders.find(o => o.orderId === orderId);

        if (order.status === 'delivered') {
            // For delivered orders, mark as returned
            try {
                await returnOrder(userId, orderId);
                alert('Order returned successfully');
                document.body.removeChild(document.querySelector('.confirmation-overlay'));
                document.body.style.overflow = '';
                displayOrders(currentTab); // Refresh the orders list
            } catch (error) {
                console.error('Error returning order:', error);
                alert('Failed to return order. Please try again.');
            }
            return;
        }

        if (!userId) {
            alert('Please login to cancel the order');
            return;
        }

        try {
            // Call a function to cancel the order in Firebase (implement this function in firebase-utils.js)
            await cancelOrder(userId, orderId);
            alert('Order cancelled successfully');
            document.body.removeChild(document.querySelector('.confirmation-overlay'));
            document.body.style.overflow = '';
            displayOrders(currentTab); // Refresh the orders list
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Failed to cancel order. Please try again.');
        }
    }

    function showReturnConfirmation(event) {
        const btn = event.target;
        const orderId = btn.dataset.orderId;
        const confirmationOverlay = document.createElement('div');
        confirmationOverlay.classList.add('confirmation-overlay');
        confirmationOverlay.innerHTML = `
            <div class="confirmation-content">
                <p>Are you sure you want to return this order?</p>
                <button class="confirm-return-btn" data-order-id="${orderId}">Yes, Return Order</button>
                <button class="close-confirmation-overlay">No, Go Back</button>
            </div>
        `;
        document.body.appendChild(confirmationOverlay);
        document.body.style.overflow = 'hidden';

        document.querySelector('.confirm-return-btn').addEventListener('click', handleReturnOrder);
        document.querySelector('.close-confirmation-overlay').addEventListener('click', () => {
            document.body.removeChild(confirmationOverlay);
            document.body.style.overflow = '';
        });
    }

    async function handleReturnOrder(event) {
        const btn = event.target;
        const orderId = btn.dataset.orderId;
        const userId = localStorage.getItem('userEmail');

        if (!userId) {
            alert('Please login to return the order');
            return;
        }

        try {
            await returnOrder(userId, orderId);
            alert('Order returned successfully');
            document.body.removeChild(document.querySelector('.confirmation-overlay'));
            document.body.style.overflow = '';
            displayOrders(currentTab); // Refresh the orders list
        } catch (error) {
            console.error('Error returning order:', error);
            alert('Failed to return order. Please try again.');
        }
    }

    const tabs = document.querySelectorAll('.order-tab');
    let currentTab = 'all';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.status;
            displayOrders(currentTab);
        });
    });

    // Initialize display
    displayOrders();

    // Update cart count when page loads
    updateCartCount();
    
    // Listen for storage changes to update cart count
    window.addEventListener('storage', function(e) {
        if (e.key === 'cartItems') {
            updateCartCount();
        }
    });
});

// Add this function after the existing DOMContentLoaded event listener

function updateCartCount() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cartItems.length;
        cartCount.style.display = cartItems.length > 0 ? 'flex' : 'none';
    }
}