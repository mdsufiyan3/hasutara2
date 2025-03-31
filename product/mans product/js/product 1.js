import { auth, db } from '/js/firebase-config.js';
import { doc, setDoc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function showLoading() {
    document.querySelector('.loading-overlay').style.opacity = '1';
    document.querySelector('.loading-overlay').style.visibility = 'visible';
}

function hideLoading() {
    document.querySelector('.loading-overlay').style.opacity = '0';
    setTimeout(() => {
        document.querySelector('.loading-overlay').style.visibility = 'hidden';
    }, 500);
}

function updateHeaderCartCount() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Toast notification function
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add this function at the top level
function checkUserRole() {
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const productOwnerId = localStorage.getItem('productOwnerId');
    
    // Check if user is the admin or the product owner
    return userEmail === 'abufiyan8@gmail.com' || 
           userRole === 'admin' || 
           (userRole === 'owner' && userId === productOwnerId);
}

document.addEventListener('DOMContentLoaded', async function() {
    // Add menu toggle functionality
    const menuIcon = document.querySelector('.menu-icon');
    const menuOverlay = document.querySelector('.menu-overlay');
    const menuCloseBtn = document.querySelector('.menu-close-btn');
    
    if (menuIcon && menuOverlay) {
        menuIcon.addEventListener('click', function() {
            this.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            document.body.style.overflow = menuOverlay.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    if (menuIcon && menuOverlay) {
        menuIcon.addEventListener('click', function() {
            this.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            document.body.style.overflow = menuOverlay.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking close button
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

    // Get product ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Load product details (replace with your actual data fetching logic)
    loadProductDetails(productId);

    // Add click handlers for size buttons
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            sizeButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            // Remove active class from all buttons
            sizeButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            // Store selected size
            const selectedSize = button.dataset.size;
            // Optional: You can use this selectedSize value when adding to cart
        });
    });

    // Quantity controls
    const quantityInput = document.getElementById('quantity');
    document.getElementById('decreaseQuantity').addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });

    document.getElementById('increaseQuantity').addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) {
            quantityInput.value = currentValue + 1;
        }
    });

    // Add to Cart functionality
    document.getElementById('addToCart').addEventListener('click', async function() {
        const addToCartBtn = this;
        try {
            // Check if user is logged in
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                window.location.href = '/login.html';
                return;
            }

            // Check if size is selected
            const selectedSize = document.querySelector('.size-btn.selected');
            if (!selectedSize) {
                showToast('Please select a size');
                return;
            }

            // Add loading state
            addToCartBtn.classList.add('btn-loading');
            addToCartBtn.disabled = true;

            // Get product details
            const product = {
                id: productId,
                title: document.getElementById('productTitle').textContent,
                price: document.getElementById('productPrice').textContent,
                size: selectedSize.dataset.size,
                quantity: parseInt(document.getElementById('quantity').value),
                image: document.getElementById('mainImage').src,
                addedAt: new Date().toISOString()
            };

            // Simulate network delay (remove in production)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Save to localStorage
            let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            cartItems.push(product);
            localStorage.setItem('cartItems', JSON.stringify(cartItems));

            // Save to Firebase
            const cartRef = doc(db, `users/${userEmail}/cart/data`);
            const cartDoc = await getDoc(cartRef);
            let firebaseCartItems = cartDoc.exists() ? cartDoc.data().items || [] : [];
            
            firebaseCartItems.push(product);
            
            await setDoc(cartRef, {
                items: firebaseCartItems,
                updatedAt: new Date().toISOString()
            });

            updateHeaderCartCount();
            showToast('Added to cart successfully!');

        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Failed to add to cart. Please try again.');
        } finally {
            // Remove loading state
            addToCartBtn.classList.remove('btn-loading');
            addToCartBtn.disabled = false;
        }
    });

    // Buy Now
    const buyNowBtn = document.getElementById('buyNow');
    buyNowBtn.addEventListener('click', handleBuyNow);

    // Add this after existing DOMContentLoaded code
    const headerEditIcon = document.querySelector('.nav-icon.edit-icon');
    const mainImageEditBtn = document.querySelector('.edit-image-btn');
    const specsEditBtn = document.querySelector('.edit-specs-btn');
    
    // Check user role and show/hide edit buttons accordingly
    if (checkUserRole()) {
        headerEditIcon.style.display = 'flex';
    } else {
        headerEditIcon.style.display = 'none';
        mainImageEditBtn.style.display = 'none';
        specsEditBtn.style.display = 'none';
    }
    
    headerEditIcon.addEventListener('click', function(e) {
        e.preventDefault();
        if (!checkUserRole()) {
            showToast('You do not have permission to edit this product');
            return;
        }
        
        const isActive = !this.classList.contains('active');
        
        // Toggle both edit buttons
        mainImageEditBtn.style.display = isActive ? 'flex' : 'none';
        specsEditBtn.style.display = isActive ? 'flex' : 'none';
        
        // Toggle active state
        this.classList.toggle('active');
    });

    // Hide edit buttons when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-icon.edit-icon') && 
            !e.target.closest('.edit-image-btn') && 
            !e.target.closest('.edit-specs-btn') &&
            !e.target.closest('.spec-edit-input') &&
            !e.target.closest('.spec-edit-save-btn')) {
            mainImageEditBtn.style.display = 'none';
            specsEditBtn.style.display = 'none';
            headerEditIcon.classList.remove('active');
        }
    });

    initializeProductEdit();

    // Initialize carousel after loading product details
    initializeCarousel();

    // Initialize brand metrics animation
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const metricsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const metrics = entry.target.querySelectorAll('.metric-fill');
                metrics.forEach(metric => {
                    const width = metric.style.width;
                    metric.style.width = '0';
                    setTimeout(() => {
                        metric.style.width = width;
                    }, 100);
                });
                metricsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const brandMetrics = document.querySelector('.brand-metrics');
    if (brandMetrics) {
        metricsObserver.observe(brandMetrics);
    }

    initializeGalaxyAnimation();

    // Add this after other DOMContentLoaded code
    
    // Tab functionality
    initializeTabs();

    // Initialize poster grid thumbnails
    const productImages = await loadProductImages(productId);
    if (productImages && productImages.length > 0) {
        const posterThumbnails = document.querySelectorAll('.poster-thumbnail');
        posterThumbnails.forEach((thumbnail, index) => {
            if (productImages[index]) {
                thumbnail.src = productImages[index];
                thumbnail.closest('.poster-item').addEventListener('click', () => {
                    document.getElementById('mainImage').src = productImages[index];
                    // Update active thumbnail
                    document.querySelectorAll('.thumbnail-container img').forEach(thumb => {
                        thumb.classList.toggle('active', thumb.src === productImages[index]);
                    });
                });
            }
        });
    }

    // Load similar products
    await loadSimilarProducts(productId);

    // ...rest of existing DOMContentLoaded code...
    initializeReviewImageViewer();
    initializeAllReviewsOverlay();
});

// Add these new functions after the existing code
function saveProductToLocalStorage(productId, data) {
    const storageKey = `product_1_${productId}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
}

function getProductFromLocalStorage(productId) {
    const storageKey = `product_1_${productId}`;
    const savedData = localStorage.getItem(storageKey);
    return savedData ? JSON.parse(savedData) : null;
}

// Modify the loadProductDetails function
async function loadProductDetails(productId) {
    showLoading();
    try {
        // Get product reference from Firestore
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Product not found');
        }

        const productData = docSnap.data();
        
        // Update UI with product details
        document.getElementById('productCategory').textContent = productData.category || '';
        document.getElementById('productTitle').textContent = productData.title || '';
        document.getElementById('productPrice').textContent = `₹${productData.price?.toLocaleString() || '0'}`;
        
        // Update main image
        const mainImage = document.getElementById('mainImage');
        if (productData.images && productData.images.length > 0) {
            mainImage.src = productData.images[0];
            mainImage.alt = productData.title;
        }

        // Update thumbnails
        const thumbnailContainer = document.querySelector('.thumbnail-container');
        thumbnailContainer.innerHTML = ''; // Clear existing thumbnails
        
        if (productData.images) {
            productData.images.forEach((image, index) => {
                const thumbnail = document.createElement('img');
                thumbnail.src = image;
                thumbnail.alt = `${productData.title} view ${index + 1}`;
                thumbnail.classList.add('thumbnail');
                if (index === 0) thumbnail.classList.add('active');
                
                thumbnail.addEventListener('click', () => {
                    // Update main image
                    mainImage.src = image;
                    // Update active state
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumbnail.classList.add('active');
                });
                
                thumbnailContainer.appendChild(thumbnail);
            });
        }

        // Update stock status
        updateStockStatusDisplay(productData.stockLevel <= 0 ? 'out-of-stock' : 
                               productData.stockLevel <= 10 ? 'low-stock' : 'in-stock');

        // Update size buttons based on available sizes
        if (productData.sizes) {
            const sizeButtons = document.querySelectorAll('.size-btn');
            sizeButtons.forEach(button => {
                const size = button.dataset.size;
                const isAvailable = productData.sizes.includes(size);
                button.disabled = !isAvailable;
                button.classList.toggle('unavailable', !isAvailable);
            });
        }

        // Initialize specifications tab
        const specificationsPanel = document.getElementById('tab-specifications');
        if (specificationsPanel && productData.specifications) {
            // Update the individual specification spans
            document.getElementById('productColor').textContent = productData.specifications.color || 'N/A';
            document.getElementById('productFabric').textContent = productData.specifications.fabric || 'N/A';
            document.getElementById('productWashCare').textContent = productData.specifications.washCare || 'N/A';
            
            const specsList = specificationsPanel.querySelector('.specs-list');
            specsList.innerHTML = Object.entries(productData.specifications)
                .map(([key, value]) => {
                    if (!value) return ''; // Skip empty values
                    return `<li><strong>${key[0].toUpperCase() + key.slice(1)}:</strong> ${value}</li>`;
                })
                .filter(item => item) // Remove empty items
                .join('');
        }

        // Initialize description tab
        const descriptionPanel = document.getElementById('tab-description');
        if (descriptionPanel && productData.description) {
            const descriptionContent = descriptionPanel.querySelector('p');
            if (descriptionContent) {
                descriptionContent.textContent = productData.description;
            }
        }

        // Update poster thumbnails
        if (productData.images && productData.images.length > 0) {
            await updatePosterThumbnails(productData.images);
        }

        // Load similar products after loading the main product
        await loadSimilarProducts(productId);

        // Load and display reviews
        await loadProductReviews(productId);

    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product details');
    } finally {
        hideLoading();
    }
}

async function handleAddToCart() {
    const addToCartBtn = document.getElementById('addToCart');
    try {
        const userId = localStorage.getItem('userEmail');
        if (!userId) {
            window.location.href = 'login.html';
            return;
        }

        const selectedSize = document.querySelector('.size-btn.selected');
        if (!selectedSize) {
            alert('Please select a size');
            return;
        }

        // Add loading state to button
        addToCartBtn.classList.add('btn-loading');
        addToCartBtn.disabled = true;

        const product = {
            id: new URLSearchParams(window.location.search).get('id'),
            title: document.getElementById('productTitle').textContent,
            price: document.getElementById('productPrice').textContent,
            size: selectedSize.dataset.size,
            quantity: parseInt(document.getElementById('quantity').value),
            image: document.getElementById('mainImage').src
        };

        const button = document.getElementById('addToCart');
        button.disabled = true;
        button.textContent = 'Adding...';

        await addToCart(userId, product);
        updateHeaderCartCount();
        
        button.textContent = 'Added to Cart!';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Add to Cart';
        }, 2000);

    } catch (error) {
        console.error('Error adding to cart:', error);
        const button = document.getElementById('addToCart');
        button.textContent = 'Error';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Add to Cart';
        }, 2000);
    }
}

async function handleBuyNow() {
    const buyNowBtn = document.getElementById('buyNow');
    const selectedSize = document.querySelector('.size-btn.selected');
    
    try {
        // Check if user is logged in
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
            window.location.href = '/login.html';
            return;
        }

        // Check if size is selected
        if (!selectedSize) {
            showToast('Please select a size');
            return;
        }

        // Add loading state
        buyNowBtn.classList.add('btn-loading');
        buyNowBtn.disabled = true;

        // Clear existing cart
        localStorage.removeItem('cartItems');

        // Create new cart with just this item
        const product = {
            id: new URLSearchParams(window.location.search).get('id'),
            title: document.getElementById('productTitle').textContent,
            price: document.getElementById('productPrice').textContent,
            size: selectedSize.dataset.size,
            quantity: parseInt(document.getElementById('quantity').value),
            image: document.getElementById('mainImage').src,
            addedAt: new Date().toISOString()
        };

        // Simulate network delay (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Save single item to cart
        localStorage.setItem('cartItems', JSON.stringify([product]));

        // Redirect to checkout
        window.location.href = '/checkout.html';

    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to process. Please try again.');
        // Remove loading state if error occurs
        buyNowBtn.classList.remove('btn-loading');
        buyNowBtn.disabled = false;
    }
}

// Mock function - replace with actual data fetching
async function fetchProductData(productId) {
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            throw new Error('Product not found');
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        // Return default data if saved product doesn't exist
        return {
            id: productId,
            category: 'summer collection',
            title: 'Classic T-Shirt',
            price: '₹899',
            originalPrice: '₹1799',
            images: [
                'image/tshirt1.jpg',
                'image/tshirt2.jpg',
                'image/tshirt3.jpg',
                'image/tshirt4.jpg',
                'image/tshirt5.jpg'
            ],
            // ...rest of default data...
        };
    }
}

// Add these functions after the existing code

function initializeProductEdit() {
    if (!checkUserRole()) {
        return; // Exit if user doesn't have permission
    }
    
    const editBtn = document.querySelector('.edit-image-btn');
    const editOverlay = document.getElementById('productEditOverlay');
    const closeBtn = document.querySelector('.close-edit-overlay');
    const cancelBtn = document.querySelector('.cancel-edit');
    const saveBtn = document.querySelector('.save-edit');
    const mainImageUpload = document.getElementById('mainImageUpload');
    const mainImageInput = document.getElementById('mainImageInput');
    const thumbnailInput = document.getElementById('thumbnailInput');
    const addThumbnailBtn = document.querySelector('.add-thumbnail');

    // Initialize form with current values
    function populateEditForm() {
        const mainImage = document.getElementById('mainImage');
        const editMainImage = document.getElementById('editMainImage');
        const titleInput = document.getElementById('editTitle');
        const priceInput = document.getElementById('editPrice');

        editMainImage.src = mainImage.src;
        titleInput.value = document.getElementById('productTitle').textContent;
        priceInput.value = document.getElementById('productPrice').textContent.replace('₹', '');

        // Load thumbnails
        const thumbnailContainer = document.getElementById('thumbnailContainer');
        const existingThumbnails = document.querySelectorAll('.thumbnail');
        thumbnailContainer.innerHTML = ''; // Clear existing thumbnails
        existingThumbnails.forEach(thumb => {
            const thumbItem = createThumbnailItem(thumb.src);
            thumbnailContainer.appendChild(thumbItem);
        });
        thumbnailContainer.appendChild(addThumbnailBtn);

        // Add this new code for size and stock
        const sizeData = {
            'S': { available: false, stock: 0 },
            'M': { available: true, stock: 50 },
            'L': { available: true, stock: 30 },
            'XL': { available: true, stock: 20 }
        };

        // Populate size and stock data
        Object.entries(sizeData).forEach(([size, data]) => {
            const toggle = document.querySelector(`.size-toggle[data-size="${size}"]`);
            const stockInput = document.querySelector(`.stock-input[data-size="${size}"]`);
            
            if (toggle && stockInput) {
                toggle.checked = data.available;
                stockInput.value = data.stock;
                stockInput.disabled = !data.available;
            }
        });

        // Add this code to populate stock status
        const stockStatus = {
            status: 'in-stock',
            threshold: 10,
            notifications: true
        };

        const statusSelect = document.getElementById('stockStatusSelect');
        const thresholdInput = document.getElementById('stockAlertThreshold');
        const notificationToggle = document.getElementById('stockNotificationToggle');

        if (statusSelect && thresholdInput && notificationToggle) {
            statusSelect.value = stockStatus.status;
            thresholdInput.value = stockStatus.threshold;
            notificationToggle.checked = stockStatus.notifications;

            // Update select styling based on status
            statusSelect.dataset.status = stockStatus.status;
        }
    }

    function createThumbnailItem(src) {
        const div = document.createElement('div');
        div.className = 'thumbnail-item';
        div.innerHTML = `
            <img src="${src}" alt="Thumbnail" class="edit-thumbnail">
            <button class="remove-thumbnail">
                <i class="fas fa-times"></i>
            </button>
            <div class="thumbnail-change-overlay">
                <label class="thumbnail-change-icon" role="button" tabindex="0">
                    <i class="fas fa-plus"></i>
                    <input type="file" class="thumbnail-file-input" accept="image/*" style="display: none;">
                </label>
            </div>
        `;

        // Handle file input change
        const fileInput = div.querySelector('.thumbnail-file-input');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const thumbnailImg = div.querySelector('img');
                    thumbnailImg.src = e.target.result;
                    
                    // Update corresponding thumbnail in main view
                    const mainThumbnails = document.querySelector('.thumbnail-container');
                    const mainThumbnailIndex = Array.from(thumbnailContainer.children).indexOf(div);
                    if (mainThumbnailIndex !== -1 && mainThumbnails.children[mainThumbnailIndex]) {
                        mainThumbnails.children[mainThumbnailIndex].src = e.target.result;
                    }
                    
                    showToast('Thumbnail updated successfully!');
                };
                reader.readAsDataURL(file);
            }
        });

        // Add click event to update main image when thumbnail is clicked
        const thumbnailImg = div.querySelector('img');
        thumbnailImg.addEventListener('click', () => {
            document.getElementById('editMainImage').src = thumbnailImg.src;
            
            // Remove active class from all thumbnails
            div.parentElement.querySelectorAll('.thumbnail-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Add active class to clicked thumbnail
            div.classList.add('selected');
        });

        // Handle remove functionality
        const removeBtn = div.querySelector('.remove-thumbnail');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            div.remove();
            showToast('Thumbnail removed');
        });

        return div;
    }

    // Event Listeners
    editBtn.addEventListener('click', () => {
        editOverlay.classList.add('active');
        populateEditForm();
    });

    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            editOverlay.classList.remove('active');
        });
    });

    mainImageUpload.addEventListener('click', () => {
        mainImageInput.click();
    });

    mainImageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('editMainImage').src = e.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    addThumbnailBtn.addEventListener('click', () => {
        thumbnailInput.click();
    });

    thumbnailInput.addEventListener('change', (e) => {
        handleThumbnailUpload(e.target.files);
    });

    saveBtn.addEventListener('click', async () => {
        const productId = new URLSearchParams(window.location.search).get('id');
        const updatedData = {
            mainImage: document.getElementById('editMainImage').src,
            title: document.getElementById('editTitle').value,
            price: document.getElementById('editPrice').value,
            category: document.getElementById('productCategory').textContent,
            images: Array.from(document.querySelectorAll('.edit-thumbnail')).map(img => img.src),
            sizes: Array.from(document.querySelectorAll('.size-stock-item')).reduce((acc, item) => {
                const size = item.querySelector('.size-label').textContent;
                const available = item.querySelector('.size-toggle').checked;
                const stock = parseInt(item.querySelector('.stock-input').value) || 0;
                
                acc[size] = { available, stock };
                return acc;
            }, {}),
            stockStatus: {
                status: document.getElementById('stockStatusSelect').value,
                threshold: parseInt(document.getElementById('stockAlertThreshold').value) || 0,
                notifications: document.getElementById('stockNotificationToggle').checked
            }
        };

        try {
            // Save to localStorage
            saveProductToLocalStorage(productId, updatedData);

            // Update UI
            document.getElementById('mainImage').src = updatedData.mainImage;
            document.getElementById('productTitle').textContent = updatedData.title;
            document.getElementById('productPrice').textContent = `₹${updatedData.price}`;
            
            // Update size buttons availability immediately after saving
            updateSizeButtonsAvailability(updatedData.stockStatus.status);
            
            // ...rest of the existing update UI code...

            editOverlay.classList.remove('active');
            showToast('Product updated successfully!');
        } catch (error) {
            console.error('Error updating product:', error);
            showToast('Failed to update product');
        }
    });

    // Add this new function for handling thumbnail uploads
    function handleThumbnailUpload(files) {
        const thumbnailContainer = document.getElementById('thumbnailContainer');
        const maxThumbnails = 5; // Maximum number of thumbnails allowed
        const currentThumbnails = thumbnailContainer.querySelectorAll('.thumbnail-item:not(.add-thumbnail)').length;
        const remainingSlots = maxThumbnails - currentThumbnails;
        
        // Convert FileList to Array and limit to remaining slots
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload only image files');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const thumbItem = document.createElement('div');
                thumbItem.className = 'thumbnail-item';
                thumbItem.innerHTML = `
                    <img src="${e.target.result}" alt="Thumbnail">
                    <button class="remove-thumbnail">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="thumbnail-overlay">
                        <i class="fas fa-check"></i>
                    </div>
                `;

                // Add remove functionality
                const removeBtn = thumbItem.querySelector('.remove-thumbnail');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    thumbItem.remove();
                });

                // Insert before the add button
                const addButton = thumbnailContainer.querySelector('.add-thumbnail');
                thumbnailContainer.insertBefore(thumbItem, addButton);

                // Hide add button if max thumbnails reached
                if (thumbnailContainer.querySelectorAll('.thumbnail-item:not(.add-thumbnail)').length >= maxThumbnails) {
                    addButton.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        });

        if (currentThumbnails + filesToProcess.length >= maxThumbnails) {
            showToast(`Maximum ${maxThumbnails} thumbnails allowed`);
        }
    }

    // Add drag and drop functionality for thumbnails
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        thumbnailContainer.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    thumbnailContainer.addEventListener('dragenter', () => {
        thumbnailContainer.classList.add('drag-active');
    });

    thumbnailContainer.addEventListener('dragleave', () => {
        thumbnailContainer.classList.remove('drag-active');
    });

    thumbnailContainer.addEventListener('drop', (e) => {
        thumbnailContainer.classList.remove('drag-active');
        const files = e.dataTransfer.files;
        handleThumbnailUpload(files);
    });

    // Add event listeners for size toggles
    document.querySelectorAll('.size-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const size = e.target.dataset.size;
            const stockInput = document.querySelector(`.stock-input[data-size="${size}"]`);
            
            if (stockInput) {
                stockInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    stockInput.value = '0';
                }
            }
        });
    });

    // Add validation for stock inputs
    document.querySelectorAll('.stock-input').forEach(input => {
        input.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) {
                e.target.value = '0';
            }
        });
    });

    // Add event listeners for stock status controls
    const statusSelect = document.getElementById('stockStatusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            e.target.dataset.status = e.target.value;
            updateStockStatusDisplay(e.target.value);
        });
    }

    const thresholdInput = document.getElementById('stockAlertThreshold');
    if (thresholdInput) {
        thresholdInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) {
                e.target.value = '0';
            }
        });
    }

    function updateStockStatusDisplay(status) {
        const stockStatus = document.querySelector('.stock-status');
        const totalStock = calculateTotalStock();
        const addToCartBtn = document.getElementById('addToCart');
        const buyNowBtn = document.getElementById('buyNow');
        
        if (stockStatus) {
            let statusClass, statusText, iconClass;
            
            switch (status) {
                case 'out-of-stock':
                    statusClass = 'out-of-stock';
                    statusText = 'Out of Stock';
                    iconClass = 'fa-times-circle';
                    // Hide buttons when out of stock
                    addToCartBtn.style.display = 'none';
                    buyNowBtn.style.display = 'none';
                    break;
                case 'low-stock':
                    statusClass = 'low-stock';
                    statusText = 'Low Stock';
                    iconClass = 'fa-exclamation-circle';
                    // Show buttons
                    addToCartBtn.style.display = 'flex';
                    buyNowBtn.style.display = 'flex';
                    break;
                case 'pre-order':
                    statusClass = 'pre-order';
                    statusText = 'Pre Order';
                    iconClass = 'fa-clock';
                    // Show buttons
                    addToCartBtn.style.display = 'flex';
                    buyNowBtn.style.display = 'flex';
                    break;
                default:
                    statusClass = 'in-stock';
                    statusText = 'In Stock';
                    iconClass = 'fa-check-circle';
                    // Show buttons
                    addToCartBtn.style.display = 'flex';
                    buyNowBtn.style.display = 'flex';
                    break;
            }

            stockStatus.className = `stock-status ${statusClass}`;
            stockStatus.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span>${statusText}</span>
                ${status === 'low-stock' ? `<span class="stock-count">(${totalStock} left)</span>` : ''}
            `;

            // Update size buttons availability
            updateSizeButtonsAvailability(status);
        }
    }

    function calculateTotalStock() {
        return Array.from(document.querySelectorAll('.stock-input'))
            .reduce((total, input) => {
                const isAvailable = input.closest('.size-stock-item')
                    .querySelector('.size-toggle').checked;
                return total + (isAvailable ? parseInt(input.value) || 0 : 0);
            }, 0);
    }

    function updateSizeButtonsAvailability(status) {
        const sizeButtons = document.querySelectorAll('.size-btn');
        sizeButtons.forEach(button => {
            const size = button.dataset.size;
            const sizeStockInput = document.querySelector(`.stock-input[data-size="${size}"]`);
            const sizeToggle = document.querySelector(`.size-toggle[data-size="${size}"]`);
            
            // Check if size is available and has stock
            const isAvailable = status !== 'out-of-stock' && 
                sizeToggle?.checked &&
                parseInt(sizeStockInput?.value || 0) > 0;

            // Update button state
            button.disabled = !isAvailable;
            button.classList.toggle('unavailable', !isAvailable);
            
            if (!isAvailable) {
                button.classList.remove('selected', 'active');
            }
        });
    }

    initializeRelatedProductsEdit();
    
    // Load existing related products
    const productId = new URLSearchParams(window.location.search).get('id');
    const productData = getProductFromLocalStorage(productId);
    if (productData?.relatedProducts) {
        const relatedProductsGrid = document.querySelector('.related-products-grid');
        relatedProductsGrid.innerHTML = '';
        productData.relatedProducts.forEach(product => {
            const item = createRelatedProductItem(product);
            relatedProductsGrid.appendChild(item);
        });
    }
}

function updateStockStatusDisplay(status) {
    const stockStatus = document.querySelector('.stock-status');
    const totalStock = calculateTotalStock();
    const addToCartBtn = document.getElementById('addToCart');
    const buyNowBtn = document.getElementById('buyNow');
    
    if (stockStatus) {
        let statusClass, statusText, iconClass;
        
        switch (status) {
            case 'out-of-stock':
                statusClass = 'out-of-stock';
                statusText = 'Out of Stock';
                iconClass = 'fa-times-circle';
                // Hide buttons when out of stock
                addToCartBtn.style.display = 'none';
                buyNowBtn.style.display = 'none';
                break;
            case 'low-stock':
                statusClass = 'low-stock';
                statusText = 'Low Stock';
                iconClass = 'fa-exclamation-circle';
                // Show buttons
                addToCartBtn.style.display = 'flex';
                buyNowBtn.style.display = 'flex';
                break;
            case 'pre-order':
                statusClass = 'pre-order';
                statusText = 'Pre Order';
                iconClass = 'fa-clock';
                // Show buttons
                addToCartBtn.style.display = 'flex';
                buyNowBtn.style.display = 'flex';
                break;
            default:
                statusClass = 'in-stock';
                statusText = 'In Stock';
                iconClass = 'fa-check-circle';
                // Show buttons
                addToCartBtn.style.display = 'flex';
                buyNowBtn.style.display = 'flex';
                break;
        }

        stockStatus.className = `stock-status ${statusClass}`;
        stockStatus.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${statusText}</span>
            ${status === 'low-stock' ? `<span class="stock-count">(${totalStock} left)</span>` : ''}
        `;

        // Update size buttons availability
        updateSizeButtonsAvailability(status);
    }
}

function calculateTotalStock() {
    return Array.from(document.querySelectorAll('.stock-input'))
        .reduce((total, input) => {
            const isAvailable = input.closest('.size-stock-item')
                .querySelector('.size-toggle').checked;
            return total + (isAvailable ? parseInt(input.value) || 0 : 0);
        }, 0);
}

function updateSizeButtonsAvailability(status) {
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(button => {
        const size = button.dataset.size;
        const sizeStockInput = document.querySelector(`.stock-input[data-size="${size}"]`);
        const sizeToggle = document.querySelector(`.size-toggle[data-size="${size}"]`);
        
        // Check if size is available and has stock
        const isAvailable = status !== 'out-of-stock' && 
            sizeToggle?.checked &&
            parseInt(sizeStockInput?.value || 0) > 0;

        // Update button state
        button.disabled = !isAvailable;
        button.classList.toggle('unavailable', !isAvailable);
        
        if (!isAvailable) {
            button.classList.remove('selected', 'active');
        }
    });
}

function initializeCarousel() {
    const mainImage = document.getElementById('mainImage');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const thumbnails = Array.from(document.querySelectorAll('.thumbnail'));
    let currentIndex = 0;

    function updateImage(index) {
        // Remove active class from all thumbnails
        thumbnails.forEach(thumb => thumb.classList.remove('active'));
        
        // Add active class to current thumbnail
        thumbnails[index].classList.add('active');
        
        // Update main image with smooth transition
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.src = thumbnails[index].src;
            mainImage.style.opacity = '1';
        }, 200);
        
        currentIndex = index;
    }

    function nextImage() {
        const nextIndex = (currentIndex + 1) % thumbnails.length;
        updateImage(nextIndex);
    }

    function prevImage() {
        const prevIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
        updateImage(prevIndex);
    }

    // Add click handlers for navigation buttons
    nextBtn.addEventListener('click', nextImage);
    prevBtn.addEventListener('click', prevImage);

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextImage();
        } else if (e.key === 'ArrowLeft') {
            prevImage();
        }
    });

    // Add swipe functionality for touch devices
    let touchStartX = 0;
    let touchEndX = 0;

    mainImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    mainImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50;
        const difference = touchStartX - touchEndX;

        if (Math.abs(difference) > swipeThreshold) {
            if (difference > 0) {
                // Swipe left
                nextImage();
            } else {
                // Swipe right
                prevImage();
            }
        }
    }

    // Add sweep functionality
    const mainImageContainer = document.querySelector('.main-image');
    let startX = 0;
    let currentTranslateX = 0;
    let isDragging = false;
    let initialTouchX = 0;

    // Mouse events
    mainImageContainer.addEventListener('mousedown', startDragging);
    mainImageContainer.addEventListener('mousemove', drag);
    mainImageContainer.addEventListener('mouseup', endDragging);
    mainImageContainer.addEventListener('mouseleave', endDragging);

    // Touch events
    mainImageContainer.addEventListener('touchstart', startDragging);
    mainImageContainer.addEventListener('touchmove', drag);
    mainImageContainer.addEventListener('touchend', endDragging);

    function startDragging(e) {
        isDragging = true;
        mainImageContainer.classList.add('swiping');
        startX = e.type === 'mousedown' ? e.pageX : e.touches[0].clientX;
        initialTouchX = startX;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const currentX = e.type === 'mousemove' ? e.pageX : e.touches[0].clientX;
        const diff = currentX - startX;
        currentTranslateX = diff;

        // Apply the transform with some resistance
        const resistance = 0.3;
        mainImage.style.transform = `translateX(${diff * resistance}px)`;
    }

    function endDragging() {
        if (!isDragging) return;
        
        isDragging = false;
        mainImageContainer.classList.remove('swiping');
        mainImage.style.transform = '';

        const endX = currentTranslateX;
        const swipeThreshold = 50; // Minimum distance for swipe

        if (Math.abs(endX) > swipeThreshold) {
            if (endX > 0) {
                prevImage();
            } else {
                nextImage();
            }
        }

        currentTranslateX = 0;
    }

    // Add transition end listener to remove transform
    mainImage.addEventListener('transitionend', () => {
        mainImage.style.transform = '';
    });

    // Prevent default touch behaviors
    mainImageContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Auto-advance slideshow (optional)
    let slideshowInterval;
    
    function startSlideshow() {
        slideshowInterval = setInterval(nextImage, 5000); // Change image every 5 seconds
    }

    function stopSlideshow() {
        clearInterval(slideshowInterval);
    }

    // Stop slideshow on user interaction
    mainImage.addEventListener('mouseenter', stopSlideshow);
    mainImage.addEventListener('touchstart', stopSlideshow);

    // Start slideshow initially (optional)
    // startSlideshow();
}

// Add this function to initialize the galaxy animation
function initializeGalaxyAnimation() {
    const galaxyBackground = document.querySelector('.galaxy-background');
    if (!galaxyBackground) return;

    // Create more stars with varying sizes
    const createStars = (count) => {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            
            // Random size class with adjusted probabilities for more medium and large stars
            const size = Math.random();
            if (size < 0.5) {
                star.className = 'star small';
            } else if (size < 0.8) {
                star.className = 'star medium';
            } else {
                star.className = 'star large';
            }

            // Improved random position distribution
            star.style.left = `${Math.random() * 120 - 10}%`; // Allow some stars to overflow
            star.style.top = `${Math.random() * 120 - 10}%`;
            
            // Random twinkle duration and delay
            star.style.setProperty('--twinkle-duration', `${2 + Math.random() * 4}s`);
            star.style.animationDelay = `${Math.random() * 3}s`;

            galaxyBackground.appendChild(star);
        }
    };

    // Create shooting stars more frequently
    const createShootingStars = () => {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        
        // Random position and angle
        const startY = Math.random() * 100;
        shootingStar.style.left = '0';
        shootingStar.style.top = `${startY}%`;
        shootingStar.style.transform = `rotate(${45 + Math.random() * 15}deg)`;
        
        galaxyBackground.appendChild(shootingStar);

        // Remove shooting star after animation
        shootingStar.addEventListener('animationend', () => {
            shootingStar.remove();
        });
    };

    // Initialize more stars
    createStars(10000); // Increased from 150 to 300 stars

    // Create shooting stars more frequently
    setInterval(() => {
        if (Math.random() < 0.4) { // Increased probability from 0.3 to 0.4
            createShootingStars();
        }
    }, 1500); // Reduced interval from 2000 to 1500ms

    // Add more interactive star creation on mousemove
    let lastMove = 0;
    galaxyBackground.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMove > 30) { // Reduced from 50ms to 30ms for more responsive creation
            const rect = galaxyBackground.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Create multiple stars per movement
            for (let i = 0; i < 3; i++) { // Create 3 stars per movement
                const star = document.createElement('div');
                star.className = 'star small';
                star.style.left = `${x + (Math.random() * 10 - 5)}%`;
                star.style.top = `${y + (Math.random() * 10 - 5)}%`;
                star.style.setProperty('--twinkle-duration', '1s');
                
                galaxyBackground.appendChild(star);
                
                setTimeout(() => {
                    star.remove();
                }, 1000);
            }
            
            lastMove = now;
        }
    });
}

// ...existing code...

document.querySelector('.view-more-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    // You can add any additional tracking or analytics here before navigation
    window.location.href = '/reviews-page.html';
});

// Update createReviewElement function by removing the verified badge section
function createReviewElement(review) {
    const reviewElement = document.createElement('div');
    reviewElement.className = 'review-item';
    reviewElement.innerHTML = `
        <div class="review-header">
            <div class="review-rating">
                ${getStarRating(review.rating)}
            </div>
        </div>
        <div class="review-content">
            <p>${review.content}</p>
            ${review.images ? `
                <div class="review-images">
                    ${review.images.map(img => `
                        <img src="${img}" 
                             alt="Review photo" 
                             class="review-photo" 
                             onclick="openReviewImage(this)"
                             loading="lazy">
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="review-footer">
            <div class="user-info">
                <div class="user-name">${review.name}</div>
                <div class="review-date">${review.date}</div>
            </div>
        </div>
    `;
    
    return reviewElement;
}

// ...existing code...

function initializeRelatedProductsEdit() {
    const relatedProductsGrid = document.querySelector('.related-products-grid');
    const addRelatedProductBtn = document.querySelector('.add-related-product');

    function createRelatedProductItem(data = {}) {
        const item = document.createElement('div');
        item.className = 'related-product-item';
        item.innerHTML = `
            <div class="image-upload-area">
                <img src="${data.image || ''}" alt="Related product" class="related-product-image">
                <input type="file" class="related-image-input" hidden accept="image/*">
                <div class="upload-icon">
                    <i class="fas fa-camera"></i>
                </div>
            </div>
            <div class="related-product-details">
                <input type="text" class="related-product-title" placeholder="Product Title" value="${data.title || ''}">
                <div class="price-inputs">
                    <input type="number" class="related-product-price" placeholder="Price" value="${data.price || ''}">
                    <input type="number" class="related-product-original-price" placeholder="Original Price" value="${data.originalPrice || ''}">
                </div>
            </div>
            <button class="remove-related-product">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        // Add event listeners
        const imageUploadArea = item.querySelector('.image-upload-area');
        const imageInput = item.querySelector('.related-image-input');
        const removeBtn = item.querySelector('.remove-related-product');

        imageUploadArea.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
        removeBtn.addEventListener('click', () => item.remove());

        return item;
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = this.parentElement.querySelector('img');
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Add new related product
    addRelatedProductBtn.addEventListener('click', () => {
        const newItem = createRelatedProductItem();
        relatedProductsGrid.appendChild(newItem);
    });

    // Save functionality
    document.querySelector('.save-edit').addEventListener('click', async () => {
        const productId = new URLSearchParams(window.location.search).get('id');
        
        // Gather all related products data
        const relatedProducts = Array.from(document.querySelectorAll('.related-product-item')).map(item => ({
            image: item.querySelector('.related-product-image').src,
            title: item.querySelector('.related-product-title').value,
            price: item.querySelector('.related-product-price').value,
            originalPrice: item.querySelector('.related-product-original-price').value
        }));

        try {
            // Get existing product data
            const productData = getProductFromLocalStorage(productId) || {};
            
            // Update related products
            productData.relatedProducts = relatedProducts;
            
            // Save updated product data
            saveProductToLocalStorage(productId, productData);

            // Update display
            updateRelatedProductsDisplay(relatedProducts);
            
            showToast('Product updated successfully!');
        } catch (error) {
            console.error('Error saving related products:', error);
            showToast('Failed to save related products');
        }
    });
}

function updateRelatedProductsDisplay(products) {
    const templateRight = document.querySelector('.template-right .template-image-grid');
    if (!templateRight) return;

    templateRight.innerHTML = products.map(product => `
        <div class="grid-img-container">
            <img src="${product.image}" alt="${product.title}" class="grid-img">
            <div class="grid-img-info">
                <h3 class="grid-img-title">${product.title}</h3>
                <div class="grid-img-price">
                    <span>₹${product.price}</span>
                    <span class="original-price">₹${product.originalPrice}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Update createRelatedProductItem function
function createRelatedProductItem(data = {}) {
    const item = document.createElement('div');
    item.className = 'related-product-item';
    item.innerHTML = `
        <div class="image-upload-area">
            <img src="${data.image || ''}" alt="Related product" class="related-product-image">
            <input type="file" class="related-image-input" hidden accept="image/*">
            <div class="upload-icon">
                <i class="fas fa-camera"></i>
            </div>
        </div>
        <div class="related-product-details">
            <input type="text" class="related-product-title" placeholder="Product Title" value="${data.title || ''}">
            <div class="price-inputs">
                <input type="number" class="related-product-price" placeholder="Price" value="${data.price || ''}">
                <input type="number" class="related-product-original-price" placeholder="Original Price" value="${data.originalPrice || ''}">
            </div>
        </div>
        <button class="remove-related-product">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    // Add event listeners for image upload and removal
    const imageUploadArea = item.querySelector('.image-upload-area');
    const imageInput = item.querySelector('.related-image-input');
    const removeBtn = item.querySelector('.remove-related-product');

    imageUploadArea.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                item.querySelector('.related-product-image').src = e.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    removeBtn.addEventListener('click', () => item.remove());

    return item;
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const allPanels = document.querySelectorAll('.tab-panel');
    
    // Show first panel by default
    const defaultPanel = document.getElementById('tab-description');
    if (defaultPanel) {
        defaultPanel.classList.add('active');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.getAttribute('data-tab');
            const targetPanel = document.getElementById(targetId);

            if (!targetPanel) return;

            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            allPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button and target panel
            button.classList.add('active');
            targetPanel.classList.add('active');
        });
    });
}

// Make sure to call initializeTabs() in your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    initializeTabs();
    // ...existing code...
});

async function loadProductImages(productId) {
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().images || [];
        }
        return [];
    } catch (error) {
        console.error("Error loading product images:", error);
        return [];
    }
}

async function loadSimilarProducts(currentProductId) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        
        console.log('Loading similar products:', { currentProductId, section });
        
        if (!section) {
            console.warn('No section parameter found in URL');
            return;
        }

        const productsRef = collection(db, "products");
        const q = query(
            productsRef,
            where("section", "==", section),
            where("category", "==", "BOYS"),
            limit(5) // Get 5 products to ensure we have enough after filtering current
        );

        const querySnapshot = await getDocs(q);
        const products = [];
        
        querySnapshot.forEach((doc) => {
            // Don't include the current product
            if (doc.id !== currentProductId) {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    title: data.title,
                    price: data.price,
                    originalPrice: data.originalPrice,
                    images: data.images,
                    section: data.section
                });
            }
        });

        console.log('Found similar products:', products.length);
        
        if (products.length > 0) {
            updateTemplateGrid(products);
        } else {
            // If no similar products found, try loading from same category
            const fallbackQuery = query(
                productsRef,
                where("category", "==", "BOYS"),
                limit(4)
            );
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const fallbackProducts = [];
            fallbackSnapshot.forEach((doc) => {
                if (doc.id !== currentProductId) {
                    const data = doc.data();
                    fallbackProducts.push({
                        id: doc.id,
                        title: data.title,
                        price: data.price,
                        originalPrice: data.originalPrice,
                        images: data.images,
                        section: data.section
                    });
                }
            });
            updateTemplateGrid(fallbackProducts);
        }

    } catch (error) {
        console.error("Error loading similar products:", error);
        // Show error state in template grid
        const grid = document.querySelector('.template-image-grid');
        if (grid) {
            grid.innerHTML = '<div class="error-message">Failed to load similar products</div>';
        }
    }
}

function updateTemplateGrid(products) {
    const grid = document.querySelector('.template-image-grid');
    if (!grid) {
        console.error('Template grid element not found');
        return;
    }

    // Show loading state
    grid.innerHTML = '<div class="loading">Loading similar products...</div>';

    // Make sure we have valid products
    if (!Array.isArray(products) || products.length === 0) {
        grid.innerHTML = '<div class="no-products">No similar products found</div>';
        return;
    }

    // Create grid HTML
    const gridHTML = products.slice(0, 4).map(product => {
        if (!product.images || !product.images[0]) {
            console.warn('Product missing images:', product);
            return '';
        }

        return `
            <a href="/product/mans product/product 01-01.html?id=${product.id}&section=${product.section}" 
               class="grid-img-container">
                <img src="${product.images[0]}" alt="${product.title}" class="grid-img">
                <div class="grid-img-overlay">
                    <h3 class="grid-img-title">${product.title}</h3>
                    <div class="grid-img-price">
                        <span class="current-price">₹${product.price?.toLocaleString() || '0'}</span>
                        ${product.originalPrice ? `
                            <span class="original-price">₹${product.originalPrice?.toLocaleString()}</span>
                        ` : ''}
                    </div>
                </div>
            </a>
        `;
    }).join('');

    // Update grid with products
    grid.innerHTML = gridHTML || '<div class="no-products">No similar products found</div>';

    // Add hover effects
    const gridItems = grid.querySelectorAll('.grid-img-container');
    gridItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.classList.add('hover');
        });
        item.addEventListener('mouseleave', () => {
            item.classList.remove('hover');
        });
    });
}

async function updatePosterThumbnails(productImages) {
    const posterThumbnails = document.querySelectorAll('.poster-thumbnail');
    
    if (productImages && productImages.length > 0) {
        posterThumbnails.forEach((thumbnail, index) => {
            if (productImages[index]) {
                thumbnail.src = productImages[index];
                thumbnail.alt = `Product view ${index + 1}`;
                
                // Add click handler to update main image
                thumbnail.closest('.poster-item').addEventListener('click', () => {
                    const mainImage = document.getElementById('mainImage');
                    mainImage.src = productImages[index];
                    
                    // Update active thumbnail in the main thumbnail container
                    const thumbnails = document.querySelectorAll('.thumbnail');
                    thumbnails.forEach(thumb => thumb.classList.remove('active'));
                    if (thumbnails[index]) thumbnails[index].classList.add('active');
                });
            }
        });
    }
}

// Add this to your existing code
function initializeReviewImageViewer() {
    const modal = document.querySelector('.review-image-modal');
    const modalImg = document.getElementById('reviewModalImage');
    const closeBtn = document.querySelector('.modal-close');
    const prevBtn = document.querySelector('.modal-prev');
    const nextBtn = document.querySelector('.modal-next');
    let currentImages = [];
    let currentIndex = 0;

    // Function to open modal with image
    function openModal(images, startIndex) {
        if (!images || images.length === 0) return;
        
        currentImages = images;
        currentIndex = startIndex;
        
        modalImg.src = images[currentIndex];
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Show/hide navigation buttons based on number of images
        if (images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }
    }

    // Function to close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        modalImg.src = '';
    }

    // Function to navigate images
    function navigate(direction) {
        if (currentImages.length <= 1) return;
        
        currentIndex = (currentIndex + direction + currentImages.length) % currentImages.length;
        modalImg.src = currentImages[currentIndex];
    }

    // Event listeners for modal controls
    closeBtn?.addEventListener('click', closeModal);
    prevBtn?.addEventListener('click', () => navigate(-1));
    nextBtn?.addEventListener('click', () => navigate(1));

    // Close modal on outside click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowLeft':
                navigate(-1);
                break;
            case 'ArrowRight':
                navigate(1);
                break;
        }
    });

    // Add click handlers to all review images
    document.querySelectorAll('.review-images').forEach(reviewImages => {
        reviewImages.addEventListener('click', (e) => {
            const clickedImage = e.target.closest('.review-photo');
            if (!clickedImage) return;

            const images = Array.from(
                e.target.closest('.review-images').querySelectorAll('.review-photo')
            ).map(img => img.src);
            
            const clickedIndex = images.indexOf(clickedImage.src);
            openModal(images, clickedIndex);
        });
    });
}

// Add this line to your DOMContentLoaded event listener if it's not already there
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    initializeReviewImageViewer();
    // ...existing code...
});

// Add these functions after the existing code
function initializeAllReviewsOverlay() {
    const viewAllBtn = document.querySelector('.view-all-reviews');
    const viewMoreBtn = document.querySelector('.view-more-btn');
    const overlay = document.querySelector('.all-reviews-overlay');
    const closeBtn = document.querySelector('.close-reviews-overlay');
    const loadMoreBtn = document.querySelector('.load-more-reviews');
    let currentPage = 1;
    const reviewsPerPage = 10;

    // Add event listener for View All Reviews button
    viewAllBtn?.addEventListener('click', async () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset to first page when viewing all
        currentPage = 1;
        await loadReviews(currentPage);
    });

    viewMoreBtn?.addEventListener('click', async () => {
        currentPage++;
        await loadReviews(currentPage, false); // false means append to existing reviews
    });

    closeBtn?.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    loadMoreBtn?.addEventListener('click', async () => {
        currentPage++;
        await loadReviews(currentPage);
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

async function loadReviews(page, clearExisting = true) {
    const productId = new URLSearchParams(window.location.search).get('id');
    const reviewsGrid = document.querySelector('.reviews-grid');
    const loadMoreBtn = document.querySelector('.load-more-reviews');
    
    try {
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;

        const reviews = await getProductReviews(productId, page);
        const reviewElements = reviews.map(review => createReviewElement(review));
        
        if (clearExisting) {
            reviewsGrid.innerHTML = '';
        }
        
        reviewElements.forEach(element => reviewsGrid.appendChild(element));
        
        // Update load more button visibility
        if (reviews.length < 10) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.textContent = 'Load More Reviews';
            loadMoreBtn.disabled = false;
        }

        // Update review count
        const totalReviews = document.querySelector('.total-reviews');
        if (totalReviews) {
            const count = await getReviewCount(productId);
            totalReviews.textContent = `(${count} reviews)`;
        }

    } catch (error) {
        console.error('Error loading reviews:', error);
        loadMoreBtn.textContent = 'Error Loading Reviews';
    }
}

// Add this new function to get total review count
async function getReviewCount(productId) {
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        return docSnap.data()?.reviewCount || 0;
    } catch (error) {
        console.error('Error getting review count:', error);
        return 0;
    }
}

// Add this line in your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    initializeAllReviewsOverlay();
});

async function loadProductReviews(productId) {
    try {
        const reviewsRef = collection(db, `products/${productId}/reviews`);
        const reviewsSnapshot = await getDocs(reviewsRef);
        const reviews = [];
        
        reviewsSnapshot.forEach((doc) => {
            reviews.push({ id: doc.id, ...doc.data() });
        });

        // Update reviews count and average rating
        const reviewsCount = reviews.length;
        const averageRating = reviews.length > 0 
            ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
            : 0;

        // Update reviews summary
        const reviewsSummary = document.querySelector('.reviews-summary');
        if (reviewsSummary) {
            reviewsSummary.innerHTML = `
                <div class="average-rating">
                    <span class="rating-number">${averageRating.toFixed(1)}</span>
                    <div class="stars">
                        ${getStarRating(averageRating)}
                    </div>
                    <span class="total-reviews">(${reviewsCount} reviews)</span>
                </div>
            `;
        }

        // Update reviews list
        const reviewsList = document.querySelector('.reviews-list');
        if (reviewsList) {
            if (reviews.length > 0) {
                reviewsList.innerHTML = reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="review-rating">
                                ${getStarRating(review.rating)}
                            </div>
                        </div>
                        <div class="review-content">
                            <p>${review.text}</p>
                            ${review.images ? `
                                <div class="review-images">
                                    ${review.images.map(img => `
                                        <img src="${img}" 
                                             alt="Review photo" 
                                             class="review-photo" 
                                             onclick="openReviewImage(this)"
                                             loading="lazy">
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <div class="review-footer">
                            <div class="user-info">
                                <div class="user-name">${review.name}</div>
                                <div class="review-date">${new Date(review.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                `).join('');

                // Show view more button if there are reviews
                document.querySelector('.view-more-btn').style.display = 'block';
            } else {
                // Show no reviews message
                reviewsList.innerHTML = `
                    <div class="no-reviews">
                        <p>No reviews yet. Be the first to review this product!</p>
                    </div>
                `;
                document.querySelector('.view-more-btn').style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error loading reviews:', error);
        showToast('Failed to load reviews');
    }
}

function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);

    return `
        ${Array(fullStars).fill('<i class="fas fa-star"></i>').join('')}
        ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
        ${Array(emptyStars).fill('<i class="far fa-star"></i>').join('')}
    `;
}