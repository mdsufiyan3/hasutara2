import { initializeCartCount } from '/js/cart-handler.js';

document.addEventListener('DOMContentLoaded', function() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.error('Header container not found');
        return;
    }

    // Add leading slash to ensure path is from root
    const headerPath = headerContainer.getAttribute('data-header-path') || '/components/header/header.html';

    fetch(headerPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load header (${response.status})`);
            }
            return response.text();
        })
        .then(data => {
            headerContainer.innerHTML = data;
            initializeCartCount();
            initializeHeaderFunctionality();
            initializeScrollBehavior();
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
            if (isProductPage) {
                topMenuOverlay?.classList.add('active');
            } else {
                bottomMenuOverlay?.classList.add('active');
            }
        });
    }

    // Add click event for mobile menu
    if (mobileMenuIcon) {
        mobileMenuIcon.addEventListener('click', () => {
            if (isProductPage) {
                topMenuOverlay?.classList.add('active');
            } else {
                bottomMenuOverlay?.classList.add('active');
            }
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

    // Add close header functionality
    if (closeHeaderBtn) {
        closeHeaderBtn.addEventListener('click', () => {
            header.classList.add('hidden');
        });
    }
}

function initializeScrollBehavior() {
    let lastScrollTop = 0;
    let scrollTimeout;
    const header = document.querySelector('.bottom-header');
    const SCROLL_THRESHOLD = 5; // Reduced threshold for more sensitive response

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide header while scrolling in any direction
        if (Math.abs(currentScroll - lastScrollTop) > SCROLL_THRESHOLD) {
            header.classList.add('hidden');
            clearTimeout(scrollTimeout);
        }

        lastScrollTop = currentScroll;

        // Show header after scrolling stops
        scrollTimeout = setTimeout(() => {
            header.classList.remove('hidden');
        }, 800); // Increased delay before showing header
    }, { passive: true });

    // Show header when at top of page
    window.addEventListener('scroll', () => {
        if (window.pageYOffset === 0) {
            header.classList.remove('hidden');
        }
    }, { passive: true });
}
