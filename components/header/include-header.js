import { updateCartCount, initializeCartCount } from '/js/cart-handler.js';

document.addEventListener('DOMContentLoaded', function() {
    const headerContainer = document.getElementById('header-container');
    const headerPath = headerContainer.getAttribute('data-header-path') || 'components/header/header.html';
    
    fetch(headerPath)
        .then(response => response.text())
        .then(data => {
            headerContainer.innerHTML = data;
            initializeCartCount(); // Initialize cart functionality
            initializeHeaderFunctionality();
            initializeScrollBehavior();
            
            // Listen for cart updates
            window.addEventListener('storage', (e) => {
                if (e.key === 'lastCartUpdate') {
                    updateCartCount();
                }
            });
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
});

function initializeHeaderFunctionality() {
    const desktopMenuIcon = document.querySelector('.bottom-menu-icon.desktop-menu');
    const mobileMenuIcon = document.querySelector('.bottom-menu-icon.mobile-menu');
    const bottomMenuOverlay = document.querySelector('#bottomMenuOverlay');
    const topMenuOverlay = document.querySelector('#topMenuOverlay');
    const closeButtons = document.querySelectorAll('.menu-close-btn');
    const closeHeaderBtn = document.querySelector('.close-header');
    const header = document.querySelector('.bottom-header');

    // Check if we're on the product page
    const isProductPage = window.location.pathname.includes('product');
    const menuOverlay = isProductPage ? topMenuOverlay : bottomMenuOverlay;

    // Add click event for desktop menu
    if (desktopMenuIcon) {
        desktopMenuIcon.addEventListener('click', () => {
            menuOverlay.classList.add('active');
        });
    }

    // Add click event for mobile menu
    if (mobileMenuIcon) {
        mobileMenuIcon.addEventListener('click', () => {
            menuOverlay.classList.add('active');
        });
    }

    // Close overlay when clicking outside or close button
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            topMenuOverlay?.classList.remove('active');
            bottomMenuOverlay?.classList.remove('active');
        });
    });

    // Close overlay when clicking outside
    [topMenuOverlay, bottomMenuOverlay].forEach(overlay => {
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        }
    });

    // Add close header functionality with retry mechanism
    if (closeHeaderBtn && header) {
        closeHeaderBtn.addEventListener('click', () => {
            header.classList.add('hidden');
        });
    } else {
        // Retry initialization after a short delay
        setTimeout(() => {
            const retryCloseBtn = document.querySelector('.close-header');
            const retryHeader = document.querySelector('.bottom-header');
            if (retryCloseBtn && retryHeader) {
                retryCloseBtn.addEventListener('click', () => {
                    retryHeader.classList.add('hidden');
                });
            }
        }, 1000);
    }
}

function initializeScrollBehavior() {
    let lastScrollTop = 0;
    let isScrolling;
    const header = document.querySelector('.bottom-header');
    const SCROLL_THRESHOLD = 5;

    if (!header) return; // Exit if header not found

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Clear the previous timeout
        clearTimeout(isScrolling);

        // Hide header while scrolling
        if (Math.abs(currentScroll - lastScrollTop) > SCROLL_THRESHOLD) {
            header.classList.add('hidden');
        }

        lastScrollTop = currentScroll;

        // Set a timeout to show header after scrolling stops
        isScrolling = setTimeout(() => {
            header.classList.remove('hidden');
        }, 800);

        // Always show header at top of page
        if (currentScroll <= 0) {
            header.classList.remove('hidden');
        }
    }, { passive: true });
}