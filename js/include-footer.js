document.addEventListener('DOMContentLoaded', function() {
    // Fetch and insert footer
    fetch('/components/footer/footer.html')
        .then(response => response.text())
        .then(data => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;

            // Check if this is the product page
            const isProductPage = window.location.pathname.includes('product 01-01.html');
            
            if (isProductPage) {
                // Get product footer template content
                const productFooter = tempDiv.querySelector('#product-footer').content;
                document.body.insertAdjacentHTML('beforeend', productFooter.cloneNode(true).innerHTML);
            } else {
                // Use default footer
                const defaultFooter = tempDiv.querySelector('.footer:not(.product-footer)');
                document.body.insertAdjacentHTML('beforeend', defaultFooter.outerHTML);
            }
        })
        .catch(error => {
            console.error('Error loading footer:', error);
        });
});
