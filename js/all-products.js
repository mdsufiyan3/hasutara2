import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// Get filter elements
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const productsGrid = document.querySelector('.products-grid');

// Get category from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const initialCategory = urlParams.get('category');

if (initialCategory) {
    categoryFilter.value = initialCategory;
}

async function loadProducts() {
    try {
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading Products...</p>
            </div>
        `;

        const constraints = [];
        const urlParams = new URLSearchParams(window.location.search);
        const urlCategory = urlParams.get('category');
        const categoryType = urlParams.get('type');
        
        // First, determine which category to filter by
        if (urlCategory) {
            categoryFilter.value = urlCategory;
            constraints.push(where("section", "==", urlCategory));

            // Update page title based on category
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                const categoryNames = {
                    // MAN'S categories
                    'SHIRTS': 'All Men\'s Shirts',
                    'TSHIRTS': 'All Men\'s T-Shirts',
                    'JINSE': 'All Men\'s Jeans',
                    'BAGGY TROUSER': 'All Men\'s Baggy Trousers',
                    // Boys categories
                    'SHIRTS': 'All Shirts',
                    'TSHIRTS': 'All T-Shirts',
                    'JINSE': 'All Jeans',
                    'BAGGY TROUSER': 'All Baggy Trousers',
                    'OUTFIT-SET': 'Complete Outfit Sets',
                    'TSHIRTS-TOPS': 'T-Shirts & Tops',
                    'SHIRTS-DRESSES': 'Shirts & Dresses',
                    'JEANS-BOTTOMS': 'Jeans & Bottoms',
                    'HOODIES-SET': 'Matching Hoodies',
                    'BAGS': 'All Bags',
                    'WATCHES': 'All Watches',
                    'JEWELLERY': 'All Jewellery',
                    'BELTS': 'All Belts'
                };
                pageTitle.textContent = categoryNames[urlCategory] || urlCategory;
            }
        } else if (categoryFilter.value !== 'all') {
            constraints.push(where("section", "==", categoryFilter.value));
        }

        // Then, determine which type of products to show
        if (categoryType) {
            // Convert MANS to MAN'S for database query
            const dbCategory = categoryType === 'MANS' ? "MAN'S" : categoryType;
            constraints.push(where("category", "==", dbCategory));
        } else {
            constraints.push(where("category", "==", "COUPLE")); // Default to COUPLE
        }

        // Add sorting
        if (sortFilter.value === 'price-low') {
            constraints.push(orderBy("price", "asc"));
        } else if (sortFilter.value === 'price-high') {
            constraints.push(orderBy("price", "desc"));
        } else if (sortFilter.value === 'newest') {
            constraints.push(orderBy("timestamp", "desc"));
        }

        const q = query(collection(db, "products"), ...constraints);
        const querySnapshot = await getDocs(q);

        // Display all products without any limit
        let productsHTML = '';
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            productsHTML += createProductCard(doc, product);
        });

        productsGrid.innerHTML = productsHTML || `
            <div class="no-products">
                <p>No products found in this category</p>
            </div>
        `;

    } catch (error) {
        console.error("Error loading products:", error);
        productsGrid.innerHTML = `
            <div class="error">
                <p>Error loading products. Please try again.</p>
            </div>
        `;
    }
}

function createProductCard(doc, product) {
    return `
        <div class="product-card">
            <a href="/product/mans product/product 01-01.html?id=${doc.id}&section=${product.section}" class="product-link">
                <div class="product-image">
                    <img src="${product.images[0]}" alt="${product.title}">
                    <div class="product-overlay">
                        <h3 class="product-title">${product.title}</h3>
                        <div class="price-container">
                            <p class="price">₹${product.price.toLocaleString()}</p>
                            <p class="original-price">₹${product.originalPrice.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Add event listeners for filters
categoryFilter.addEventListener('change', loadProducts);
sortFilter.addEventListener('change', loadProducts);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Add menu functionality
    const menuIcon = document.querySelector('.menu-icon');
    const menuOverlay = document.querySelector('.menu-overlay');
    const menuCloseBtn = document.querySelector('.menu-close-btn');

    if (menuIcon && menuOverlay && menuCloseBtn) {
        menuIcon.addEventListener('click', () => {
            menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        menuCloseBtn.addEventListener('click', () => {
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close menu when clicking outside
        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) {
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    } else {
        console.error('Menu elements not found');
    }
});
