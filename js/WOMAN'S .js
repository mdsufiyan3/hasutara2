import { collection, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

const sectionPosters = {
    'TOPS': {
        image: 'image/replicate-prediction-6p2e4h9hfnrm80ckyhnb2dsqtr.png',
        title: 'Trendy Tops',
        description: 'Discover our exclusive collection of stylish tops and blouses.'
    },
    'BOTTOMS': {
        image: 'image/replicate-prediction-6p2e4h9hfnrm80ckyhnb2dsqtr.png',
        title: 'Fashion Bottoms',
        description: 'Explore our collection of trendy pants, skirts, and shorts.'
    },
    'DRESSES': {
        image: 'image/replicate-prediction-6p2e4h9hfnrm80ckyhnb2dsqtr.png',
        title: 'Elegant Dresses',
        description: 'Find your perfect dress for any occasion.'
    },
    'OUTERWEAR': {
        image: 'image/replicate-prediction-6p2e4h9hfnrm80ckyhnb2dsqtr.png',
        title: 'Stylish Outerwear',
        description: 'Complete your look with our trendy jackets and coats.'
    }
};

function createSectionPoster(section) {
    const poster = sectionPosters[section];
    if (!poster) return '';

    return `
        <div class="category-poster">
            <div class="poster-edit">
                <i class="fas fa-pencil-alt"></i>
            </div>
            <img src="${poster.image}" alt="${section} Collection" class="poster-image">
            <div class="poster-content">
                <h2 class="poster-title">${poster.title}</h2>
                <p class="poster-description">${poster.description}</p>
            </div>
        </div>
    `;
}

function createProductCard(doc, product) {
    // Make sure product.section is properly set
    const section = product.section || 'SHIRTS'; // Provide default section if missing
    
    return `
        <div class="product-card">
            <a href="product/mans product/product 01-01.html?id=${doc.id}&section=${section}" class="product-link">
                <div class="product-image">
                    <img src="${product.images[0]}" alt="${product.title}">
                    <div class="product-overlay">
                        <h3 class="product-title">${product.title}</h3>
                        <div class="price-container">
                            <p class="price">₹${product.price.toLocaleString()}</p>
                            <p class="original-price">₹${product.originalPrice.toLocaleString()}</p>
                        </div>
                    </div>
                    <button class="edit-btn" onclick="editProduct('${doc.id}', event)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="showDeleteConfirmation('${doc.id}', event)">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="delete-confirm-overlay">
                        <p class="delete-confirm-text">Are you sure you want to delete this product?</p>
                        <div class="delete-confirm-buttons">
                            <button class="confirm-btn" onclick="confirmDelete('${doc.id}', event)">Confirm</button>
                            <button class="cancel-btn" onclick="cancelDelete(event)">Cancel</button>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;
}

async function displayProducts() {
    const productsGrids = document.querySelectorAll('.products-grid');
    
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("category", "==", "WOMANS"));
        const querySnapshot = await getDocs(q);
        
        const productsBySection = {
            'TOPS': [],
            'BOTTOMS': [],
            'DRESSES': [],
            'OUTERWEAR': []
        };

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            if (productsBySection[product.section]) {
                productsBySection[product.section].push({ doc, product });
            }
        });

        productsGrids.forEach((grid) => {
            const section = grid.getAttribute('data-section');
            const sectionContainer = grid.closest('.products-section');
            
            // Remove existing poster
            const existingPoster = sectionContainer.querySelector('.category-poster');
            if (existingPoster) {
                existingPoster.remove();
            }

            // Insert poster
            const posterHTML = createSectionPoster(section);
            if (posterHTML && sectionContainer) {
                grid.insertAdjacentHTML('beforebegin', posterHTML);
                
                const poster = sectionContainer.querySelector('.category-poster');
                if (poster) {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                entry.target.classList.add('in-view');
                                observer.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.2 });
                    
                    observer.observe(poster);
                }
            }
            
            let productsHTML = '';
            const sectionProducts = productsBySection[section] || [];
            
            // Get device width for responsive limits
            const isDesktop = window.innerWidth >= 768;
            const productsLimit = isDesktop ? 4 : 6; // 4 for desktop, 6 for mobile
            
            // Limit products based on device
            const limitedProducts = sectionProducts.slice(0, productsLimit);
            
            limitedProducts.forEach(({ doc, product }) => {
                productsHTML += createProductCard(doc, product);
            });
            
            if (productsHTML) {
                grid.innerHTML = productsHTML;
                
                // Add product count indicator if there are more products
                if (sectionProducts.length > productsLimit) {
                    const remainingCount = sectionProducts.length - productsLimit;
                    const countIndicator = document.createElement('div');
                    countIndicator.className = 'more-products-indicator';
                    countIndicator.innerHTML = `+${remainingCount} more products`;
                    grid.appendChild(countIndicator);
                }
            } else {
                grid.innerHTML = `
                    <div class="no-products">
                        <p>No products found in ${section}</p>
                    </div>
                `;
            }
        });
    } catch (error) {
        console.error("Error getting products:", error);
        productsGrids.forEach(grid => {
            grid.innerHTML = '<div class="error">Error loading products</div>';
        });
    }
}

// Add window resize listener to handle responsive changes
window.addEventListener('resize', () => {
    displayProducts();
});

// Add global edit function
window.editProduct = function(productId, event) {
    event.preventDefault(); // Prevent navigation to product view
    window.location.href = `admin.html?edit=${productId}`;
};

// Add these new functions
window.showDeleteConfirmation = function(productId, event) {
    event.preventDefault();
    event.stopPropagation();
    const overlay = event.target.closest('.product-image').querySelector('.delete-confirm-overlay');
    overlay.classList.add('show');
};

window.cancelDelete = function(event) {
    event.preventDefault();
    event.stopPropagation();
    const overlay = event.target.closest('.delete-confirm-overlay');
    overlay.classList.remove('show');
};

window.confirmDelete = async function(productId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
        const productCard = event.target.closest('.product-card');
        
        // Delete from Firebase
        await deleteDoc(doc(db, "products", productId));
        
        // Animate and remove the product card
        productCard.style.transition = 'all 0.3s ease';
        productCard.style.opacity = '0';
        productCard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            productCard.remove();
            
            // Check if there are no more products
            const productsGrid = document.querySelector('.products-grid');
            if (!productsGrid.children.length) {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <p>No products found in this category</p>
                    </div>
                `;
            }
        }, 300);
        
        console.log('Product deleted successfully');
    } catch (error) {
        console.error("Error deleting product:", error);
        alert('Failed to delete product');
    }
};

// Call displayProducts when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, fetching products...');
    displayProducts();
});

// Add this to refresh products when new ones are added
export function refreshProducts() {
    displayProducts();
}
