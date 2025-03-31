document.addEventListener('DOMContentLoaded', function() {
    const menuIcon = document.querySelector('.menu-icon');
    const menuOverlay = document.querySelector('.menu-overlay');
    const menuCloseBtn = document.querySelector('.menu-close-btn');
    const menuScrollUpBtn = document.querySelector('.menu-scroll-up');
    const menuScrollDownBtn = document.querySelector('.menu-scroll-down');
    const menuCategories = document.querySelector('.menu-categories');

    // Toggle menu
    menuIcon.addEventListener('click', () => {
        menuIcon.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    });

    // Close menu
    menuCloseBtn.addEventListener('click', () => {
        menuIcon.classList.remove('active');
        menuOverlay.classList.remove('active');
    });

    // Scroll buttons functionality
    menuScrollUpBtn.addEventListener('click', () => {
        menuCategories.scrollBy({
            top: -300,
            behavior: 'smooth'
        });
    });

    menuScrollDownBtn.addEventListener('click', () => {
        menuCategories.scrollBy({
            top: 300,
            behavior: 'smooth'
        });
    });

    // Handle scroll buttons visibility
    menuCategories.addEventListener('scroll', () => {
        const showUpBtn = menuCategories.scrollTop > 100;
        const showDownBtn = menuCategories.scrollTop < (menuCategories.scrollHeight - menuCategories.clientHeight - 100);

        menuScrollUpBtn.classList.toggle('visible', showUpBtn);
        menuScrollDownBtn.classList.toggle('visible', showDownBtn);
    });
});
