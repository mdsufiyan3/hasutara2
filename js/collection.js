import { collection, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

function createProductCard(doc, product) {
    return `
        <div class="product-card">
            <a href="product-view.html?id=${doc.id}" class="product-link">
                <div class="product-image">
                    <img src="${product.images[0]}" alt="${product.title}">
                    <div class="product-overlay">
                        <h3 class="product-title">${product.title}</h3>
                        <div class="price-container">
                            <p class="price">₹${product.price.toLocaleString()}</p>
                            <p class="original-price">₹${product.originalPrice.toLocaleString()}</p>
                            <span class="discount">
                                -${Math.round((1 - product.price / product.originalPrice) * 100)}%
                            </span>
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
    const productsGrid = document.querySelector('.products-grid');
    
    try {
        // Get current page category and fix the formatting
        const currentPage = window.location.pathname.split('/').pop();
        // Fix category name extraction - remove %20 and extra spaces
        let category = decodeURIComponent(currentPage)
            .replace('.html', '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Debug logging
        console.log('Current page:', currentPage);
        console.log('Looking for category:', category);

        // Create query for category
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("category", "==", category));
        
        const querySnapshot = await getDocs(q);
        
        // Debug: Log all products found
        console.log('Total products found:', querySnapshot.size);
        querySnapshot.forEach(doc => {
            console.log('Product data:', {
                id: doc.id,
                category: doc.data().category,
                title: doc.data().title
            });
        });

        let productsHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            productsHTML += createProductCard(doc, product);
        });
        
        if (productsHTML) {
            productsGrid.innerHTML = productsHTML;
        } else {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <p>No products found in ${category}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error getting products:", error);
        productsGrid.innerHTML = '<div class="error">Error loading products</div>';
    }
}

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
