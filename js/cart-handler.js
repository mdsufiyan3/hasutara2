// Function to add item to cart
export function addToCart(product) {
    try {
        let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
        cart.push(product);
        localStorage.setItem('cartItems', JSON.stringify(cart));
        updateCartCount();
        // Trigger custom event for same-window updates
        document.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
        console.error('Error adding to cart:', error);
    }
}

// Function to get cart items
export function getCartItems() {
    return JSON.parse(localStorage.getItem('cartItems')) || [];
}

// Function to update cart count
export function updateCartCount() {
    const cartCounts = document.querySelectorAll('.cart-count');
    if (!cartCounts.length) return;

    try {
        const cartItems = getCartItems();
        const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        
        cartCounts.forEach(countElement => {
            countElement.textContent = totalItems;
            countElement.style.display = totalItems > 0 ? 'flex' : 'none';
        });

        // Trigger storage event for cross-window updates
        localStorage.setItem('lastCartUpdate', Date.now().toString());
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Add function to initialize cart count
export function initializeCartCount() {
    updateCartCount();
    
    // Listen for storage events (cross-window updates)
    window.addEventListener('storage', (e) => {
        if (e.key === 'cartItems' || e.key === 'lastCartUpdate') {
            updateCartCount();
        }
    });

    // Listen for custom events (same-window updates)
    document.addEventListener('cartUpdated', () => {
        updateCartCount();
    });
}