import { getProductDetails, getAllProductReviews } from './firebase-utils.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Get product ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            throw new Error('Product ID not found in URL');
        }

        // Fetch product details from Firebase
        const product = await getProductDetails(productId);
        console.log('Product details:', product);

        // Update the page with product details
        document.querySelector('.product-title').textContent = product.title;
        document.querySelector('.current-price').textContent = `₹${product.price.toLocaleString()}`;
        document.querySelector('.original-price').textContent = `₹${product.originalPrice.toLocaleString()}`;
        
        // Hide discount element
        const discountElement = document.querySelector('.discount');
        if (discountElement) {
            discountElement.style.display = 'none';
        }

        // Update stock status
        updateStockStatus(product.stockLevel);

        // Update main image and thumbnails
        const mainImage = document.getElementById('mainImage');
        mainImage.src = product.images[0];

        const thumbnailsContainer = document.querySelector('.thumbnails-container');
        thumbnailsContainer.innerHTML = product.images.map((img, index) => `
            <img src="${img}" alt="Thumbnail ${index + 1}" 
                 class="${index === 0 ? 'active' : ''}"
                 onclick="updateMainImage('${img}')">
        `).join('');

        // Update description tab
        document.getElementById('description').innerHTML = `
            <h3>Product Description</h3>
            <p>${product.description}</p>
            <div class="specifications">
                <p><strong>Material:</strong> ${product.specifications.material}</p>
                <p><strong>Care:</strong> ${product.specifications.care}</p>
            </div>
        `;

        // Add to cart button data
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        addToCartBtn.dataset.productId = product.id;
        addToCartBtn.dataset.price = product.price;

        // Update size options with available sizes
        updateSizeOptions(product.sizes || []);

    } catch (error) {
        console.error('Error:', error);
        showNotification('Error loading product details', 'error');
    }

    // Gallery functionality
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnails-container img');
    const thumbnailContainer = document.querySelector('.thumbnails-container');
    const leftScroll = document.querySelector('.thumb-scroll-btn.left');
    const rightScroll = document.querySelector('.thumb-scroll-btn.right');

    // Thumbnail click handlers
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            // Remove active class from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            // Add active class to clicked thumbnail
            this.classList.add('active');
            // Update main image
            mainImage.src = this.src;
            // Add fade effect
            mainImage.style.opacity = '0';
            setTimeout(() => mainImage.style.opacity = '1', 50);
        });
    });

    // Thumbnail scroll functionality
    if (leftScroll && rightScroll) {
        leftScroll.addEventListener('click', () => {
            thumbnailContainer.scrollBy({ left: -100, behavior: 'smooth' });
        });

        rightScroll.addEventListener('click', () => {
            thumbnailContainer.scrollBy({ left: 100, behavior: 'smooth' });
        });
    }

    // Size selector functionality
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(button => {
        button.addEventListener('click', function() {
            sizeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Quantity selector functionality
    const quantityInput = document.querySelector('.qty-input');
    const minusBtn = document.querySelector('.qty-btn.minus');
    const plusBtn = document.querySelector('.qty-btn.plus');

    if (minusBtn && plusBtn && quantityInput) {
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });

        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue < 10) {
                quantityInput.value = currentValue + 1;
            }
        });

        // Prevent manual input of invalid values
        quantityInput.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (value < 1) this.value = 1;
            if (value > 10) this.value = 10;
        });
    }

    // Tabs functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Show corresponding panel
            const tabId = button.getAttribute('data-tab');
            const panel = document.getElementById(tabId);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });

    // Image zoom functionality
    const zoomButton = document.querySelector('.zoom-button');
    let isZoomed = false;

    if (zoomButton) {
        zoomButton.addEventListener('click', () => {
            isZoomed = !isZoomed;
            if (isZoomed) {
                mainImage.style.transform = 'scale(1.5)';
                zoomButton.innerHTML = '<i class="fas fa-search-minus"></i>';
            } else {
                mainImage.style.transform = 'scale(1)';
                zoomButton.innerHTML = '<i class="fas fa-search-plus"></i>';
            }
        });
    }

    // Add to Cart functionality
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            // Get selected size
            const selectedSize = document.querySelector('.size-btn.active:not(.disabled)');
            if (!selectedSize) {
                showNotification('Please select a size', 'error');
                return;
            }

            // Get quantity
            const quantity = parseInt(quantityInput.value);

            // Get product details
            const product = {
                id: 'HST-001', // Get this dynamically
                title: document.querySelector('.product-title').textContent,
                price: document.querySelector('.current-price').textContent,
                size: selectedSize.getAttribute('data-size'),
                quantity: quantity,
                image: mainImage.src
            };

            // Add to cart (localStorage for now)
            addToCart(product);
            
            // Show success message
            showNotification('Product added to cart!', 'success');
            
            // Update cart count
            updateCartCount();
        });
    }

    // Example: Update stock status based on available quantity
    updateStockStatus(15); // Will show "In Stock"
    // updateStockStatus(5);  // Will show "Low Stock (5 left)"
    // updateStockStatus(0);  // Will show "Out of Stock"

    // Buy Now functionality
    const buyNowBtn = document.querySelector('.buy-now-btn');
    
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
            // Get selected size
            const selectedSize = document.querySelector('.size-btn.active:not(.disabled)');
            if (!selectedSize) {
                showNotification('Please select a size', 'error');
                return;
            }

            // Get quantity
            const quantity = parseInt(quantityInput.value);

            // Get product details
            const product = {
                id: productId,
                title: document.querySelector('.product-title').textContent,
                price: document.querySelector('.current-price').textContent,
                size: selectedSize.getAttribute('data-size'),
                quantity: quantity,
                image: mainImage.src
            };

            try {
                // Add to cart first
                addToCart(product);
                
                // Redirect to checkout page
                window.location.href = '/checkout.html';
            } catch (error) {
                console.error('Error during buy now process:', error);
                showNotification('Error processing purchase', 'error');
            }
        });
    }
});

// Helper Functions
function addToCart(product) {
    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    // Check if product already exists in cart
    const existingItemIndex = cartItems.findIndex(item => 
        item.id === product.id && item.size === product.size
    );

    if (existingItemIndex > -1) {
        // Update quantity if product exists
        cartItems[existingItemIndex].quantity += product.quantity;
    } else {
        // Add new item if product doesn't exist
        cartItems.push(product);
    }

    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

function updateCartCount() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const cartCount = document.querySelector('.cart-count');
    
    if (cartCount) {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                       type === 'error' ? 'fa-exclamation-circle' : 
                       'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    
    // Add show class after a small delay for animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add this function to update stock status
function updateStockStatus(stockLevel) {
    const stockStatus = document.querySelector('.stock-status');
    if (!stockStatus) return;

    // Remove existing classes
    stockStatus.classList.remove('in-stock', 'low-stock', 'out-of-stock');
    
    let statusHTML = '';
    if (stockLevel > 10) {
        stockStatus.classList.add('in-stock');
        statusHTML = '<i class="fas fa-check-circle"></i><span>In Stock</span>';
    } else if (stockLevel > 0) {
        stockStatus.classList.add('low-stock');
        statusHTML = `<i class="fas fa-exclamation-circle"></i><span>Low Stock (${stockLevel} left)</span>`;
    } else {
        stockStatus.classList.add('out-of-stock');
        statusHTML = '<i class="fas fa-times-circle"></i><span>Out of Stock</span>';
    }
    
    stockStatus.innerHTML = statusHTML;
}

function updateProductDetails(product) {
    // Update product title
    document.querySelector('.product-title').textContent = product.title;

    // Update prices
    const currentPrice = document.querySelector('.current-price');
    const originalPrice = document.querySelector('.original-price');
    const discount = document.querySelector('.discount');

    currentPrice.textContent = `₹${product.price.toLocaleString()}`;
    if (product.originalPrice) {
        originalPrice.textContent = `₹${product.originalPrice.toLocaleString()}`;
        const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
        discount.textContent = `-${discountPercent}%`;
    }

    // Update SKU
    document.querySelector('.product-sku').textContent = `SKU: ${product.sku || product.id}`;

    // Update stock status
    updateStockStatus(product.stockLevel || 0);

    // Update main image and thumbnails
    if (product.images && product.images.length > 0) {
        const mainImage = document.getElementById('mainImage');
        mainImage.src = product.images[0];

        const thumbnailsContainer = document.querySelector('.thumbnails-container');
        thumbnailsContainer.innerHTML = product.images.map((img, index) => `
            <img src="${img}" alt="Thumbnail ${index + 1}" 
                 class="${index === 0 ? 'active' : ''}">
        `).join('');
    }

    // Update size options
    if (product.sizes) {
        const sizeOptions = document.querySelector('.size-options');
        sizeOptions.innerHTML = ['M', 'L', 'XL'].map(size => `
            <button class="size-btn ${!product.sizes.includes(size) ? 'disabled' : ''}" 
                    data-size="${size}"
                    ${!product.sizes.includes(size) ? 'disabled' : ''}>
                ${size}
            </button>
        `).join('');
    }

    // Update description tab
    const descriptionPanel = document.getElementById('description');
    if (descriptionPanel) {
        descriptionPanel.innerHTML = `
            <h3>Product Description</h3>
            <p>${product.description || 'No description available'}</p>
        `;
    }

    // Update the click handler for size buttons
    const sizeButtons = document.querySelectorAll('.size-btn:not(.disabled)');
    sizeButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('disabled')) {
                sizeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

function updateReviewsTab(reviews) {
    const reviewsPanel = document.getElementById('reviews');
    if (!reviewsPanel) return;

    if (!reviews || reviews.length === 0) {
        reviewsPanel.innerHTML = '<p>No reviews yet</p>';
        return;
    }

    const averageRating = reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length;
    
    reviewsPanel.innerHTML = `
        <div class="reviews-summary">
            <h3>Customer Reviews</h3>
            <div class="average-rating">
                <div class="stars">
                    ${getStarRating(averageRating)}
                </div>
                <span>${averageRating.toFixed(1)} out of 5</span>
                <span>(${reviews.length} reviews)</span>
            </div>
        </div>
        <div class="reviews-list">
            ${reviews.map(review => `
                <div class="review-item">
                    <div class="review-header">
                        <div class="stars">${getStarRating(review.rating)}</div>
                        <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p class="review-text">${review.review}</p>
                    <span class="reviewer-name">By ${review.userName || 'Anonymous'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function getStarRating(rating) {
    return Array.from({ length: 5 }, (_, index) => {
        if (index + 0.5 < rating) return '<i class="fas fa-star"></i>';
        if (index < rating) return '<i class="fas fa-star-half-alt"></i>';
        return '<i class="far fa-star"></i>';
    }).join('');
}

// Global function for thumbnail clicks
window.updateMainImage = function(imgSrc) {
    const mainImage = document.getElementById('mainImage');
    mainImage.style.opacity = '0';
    mainImage.src = imgSrc;
    setTimeout(() => mainImage.style.opacity = '1', 50);

    // Update active thumbnail
    document.querySelectorAll('.thumbnails-container img').forEach(thumb => {
        thumb.classList.toggle('active', thumb.src === imgSrc);
    });
};

// Add this new function
function updateSizeOptions(availableSizes) {
    const sizeOptions = document.querySelector('.size-options');
    const allSizes = ['M', 'L', 'XL'];
    
    if (!sizeOptions) return;

    sizeOptions.innerHTML = allSizes.map(size => `
        <button class="size-btn ${!availableSizes.includes(size) ? 'disabled' : ''}" 
                data-size="${size}"
                ${!availableSizes.includes(size) ? 'disabled title="Size not available"' : ''}>
            ${size}
        </button>
    `).join('');

    // Add click handlers only to available sizes
    const sizeButtons = document.querySelectorAll('.size-btn:not(.disabled)');
    sizeButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('disabled')) {
                sizeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const thumbnailsContainer = document.querySelector('.thumbnails-container');
    const mainImage = document.getElementById('mainImage');

    try {
        // Get product data from Firestore
        const productDoc = await getDoc(doc(db, "products", productId));
        if (productDoc.exists()) {
            const product = productDoc.data();
            
            // Update main image
            if (product.images && product.images.length > 0) {
                mainImage.src = product.images[0];
                mainImage.alt = product.title;

                // Clear existing thumbnails
                thumbnailsContainer.innerHTML = '';

                // Create thumbnails
                product.images.forEach((imageUrl, index) => {
                    const thumbnail = document.createElement('img');
                    thumbnail.src = imageUrl;
                    thumbnail.alt = `${product.title} - Image ${index + 1}`;
                    thumbnail.className = index === 0 ? 'active' : '';
                    
                    thumbnail.addEventListener('click', () => {
                        // Update main image
                        mainImage.src = imageUrl;
                        mainImage.alt = `${product.title} - Image ${index + 1}`;
                        
                        // Update active state
                        document.querySelectorAll('.thumbnails-container img').forEach(thumb => {
                            thumb.classList.remove('active');
                        });
                        thumbnail.classList.add('active');
                    });

                    thumbnailsContainer.appendChild(thumbnail);
                });
            }

            // Update other product details
            document.querySelector('.product-title').textContent = product.title;
            document.querySelector('.current-price').textContent = `₹${product.price.toLocaleString()}`;
            document.querySelector('.original-price').textContent = `₹${product.originalPrice.toLocaleString()}`;
            if (product.originalPrice > product.price) {
                const discount = Math.round((1 - product.price / product.originalPrice) * 100);
                if (discount > 0 && discount < 100) {
                    document.querySelector('.discount').textContent = `-${discount}%`;
                } else {
                    document.querySelector('.discount').style.display = 'none';
                }
            } else {
                document.querySelector('.discount').style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error getting product:", error);
    }

    // Thumbnail scroll buttons functionality
    const scrollLeftBtn = document.querySelector('.thumb-scroll-btn.left');
    const scrollRightBtn = document.querySelector('.thumb-scroll-btn.right');

    scrollLeftBtn?.addEventListener('click', () => {
        thumbnailsContainer.scrollBy({ left: -100, behavior: 'smooth' });
    });

    scrollRightBtn?.addEventListener('click', () => {
        thumbnailsContainer.scrollBy({ left: 100, behavior: 'smooth' });
    });

    // Zoom functionality
    const zoomButton = document.querySelector('.zoom-button');
    const galleryMain = document.querySelector('.gallery-main');

    let isZoomed = false;

    zoomButton?.addEventListener('click', () => {
        isZoomed = !isZoomed;
        if (isZoomed) {
            galleryMain.style.position = 'fixed';
            galleryMain.style.top = '0';
            galleryMain.style.left = '0';
            galleryMain.style.width = '100%';
            galleryMain.style.height = '100vh';
            galleryMain.style.zIndex = '1000';
            galleryMain.style.background = 'rgba(0,0,0,0.9)';
            zoomButton.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            galleryMain.style = '';
            zoomButton.innerHTML = '<i class="fas fa-search-plus"></i>';
        }
    });
});
