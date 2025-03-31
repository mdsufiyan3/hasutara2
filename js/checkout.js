import { saveOrder, addNotification } from './firebase-utils.js';

function showLoading() {
    document.querySelector('.loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.querySelector('.loading-overlay').style.display = 'none';
}

function setButtonLoading(isLoading) {
    const button = document.getElementById('checkoutButton');
    if (isLoading) {
        button.classList.add('loading');
    } else {
        button.classList.remove('loading');
    }
}

// Function to generate Firebase-style order ID
function generateOrderId(length = 20) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Add this function near the top
function isUserLoggedIn() {
    const userEmail = localStorage.getItem('userEmail');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    return userEmail && isLoggedIn === 'true';
}

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const checkoutButton = document.getElementById('checkoutButton');
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    
    // Debug logs
    console.log('Initial setup:', {
        button: checkoutButton,
        options: paymentOptions
    });

    // Function to update button based on payment method
    function updateButton(paymentMethod) {
        console.log('Updating button for:', paymentMethod);
        if (paymentMethod === 'cod') {
            checkoutButton.textContent = 'CONFIRM ORDER';
            checkoutButton.style.backgroundColor = '#2ecc71';
            // Update shipping for COD
            shipping = 59.00;
        } else {
            checkoutButton.textContent = 'PROCEED TO PAYMENT';
            checkoutButton.style.backgroundColor = '#4776E6';
            // Update shipping for online payment
            shipping = 25.00;
        }
        // Update totals whenever payment method changes
        updateTotals(subtotal, shipping);
    }

    // Add change event listeners to radio buttons
    paymentOptions.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log('Payment method changed:', e.target.value);
            // Update shipping cost based on payment method
            shipping = e.target.value === 'online' ? 25.00 : 59.00;
            updateTotals(subtotal, shipping);
            updateButton(e.target.value);
        });
    });

    // Set initial button state based on default selection
    const initialPayment = document.querySelector('input[name="payment"]:checked');
    if (initialPayment) {
        updateButton(initialPayment.value);
    }

    // Load cart items from localStorage
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const cartItemsContainer = document.getElementById('cartItems');
    let subtotal = 0;

    // Display cart items
    cartItems.forEach(item => {
        const itemPrice = parseFloat(item.price.replace('₹', '').replace(',', ''));
        subtotal += itemPrice * item.quantity;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="item-image">
            <div class="item-details">
                <h3>${item.title}</h3>
                <p>Price: ${item.price}</p>
                <p>Quantity: ${item.quantity}</p>
            </div>
            <div class="item-total">
                ₹${(itemPrice * item.quantity).toFixed(2)}
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });

    // Initialize shipping cost and update totals
    let shipping = 59.00; // Default shipping cost for COD
    updateTotals(subtotal, shipping);

    // Function to generate random order number
    function generateOrderNumber() {
        const prefix = 'HS';
        const random = Math.floor(Math.random() * 100000);
        return `${prefix}${random.toString().padStart(5, '0')}`;
    }

    // Add email validation
    const emailInput = document.getElementById('email');
    const emailStatus = document.createElement('small');
    emailStatus.className = 'email-status';
    emailInput.parentNode.appendChild(emailStatus);

    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('blur', validateEmail);

    function validateEmail() {
        const email = emailInput.value.trim();
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (!email) {
            setEmailStatus('Email is required', 'error');
            return false;
        }

        if (!gmailRegex.test(email)) {
            setEmailStatus('Please enter a valid Gmail address', 'error');
            return false;
        }

        setEmailStatus('Valid Gmail address', 'success');
        return true;
    }

    function setEmailStatus(message, status) {
        emailStatus.textContent = message;
        emailStatus.className = `email-status ${status}`;
        
        // Add visual feedback to the input
        if (status === 'error') {
            emailInput.classList.add('error');
            emailInput.classList.remove('success');
        } else {
            emailInput.classList.add('success');
            emailInput.classList.remove('error');
        }
    }

    // Add phone number validation
    const phoneInput = document.getElementById('phone');
    const phoneStatus = document.createElement('small');
    phoneStatus.className = 'phone-status';
    phoneInput.parentNode.appendChild(phoneStatus);

    phoneInput.addEventListener('input', function(e) {
        // Remove any non-digit characters
        let value = e.target.value.replace(/[^\d]/g, '');
        
        // Limit to 10 digits
        if (value.length > 10) {
            value = value.slice(0, 10);
        }
        
        // Update input value
        e.target.value = value;
        
        // Validate length
        if (value.length === 0) {
            setPhoneStatus('Phone number is required', 'error');
        } else if (value.length < 10) {
            setPhoneStatus('Phone number must be 10 digits', 'error');
        } else {
            setPhoneStatus('Valid phone number', 'success');
        }
    });

    function setPhoneStatus(message, status) {
        phoneStatus.textContent = message;
        phoneStatus.className = `phone-status ${status}`;
        
        // Add visual feedback to the input
        if (status === 'error') {
            phoneInput.classList.add('error');
            phoneInput.classList.remove('success');
        } else {
            phoneInput.classList.add('success');
            phoneInput.classList.remove('error');
        }
    }

    // Modify the checkout button event listener
    document.getElementById('checkoutButton').addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            // Check if user is logged in
            if (!isUserLoggedIn()) {
                // Save current cart state
                localStorage.setItem('checkoutPending', 'true');
                // Redirect to login
                window.location.href = 'login.html';
                return;
            }

            // Validate email before proceeding
            if (!validateEmail()) {
                return;
            }

            // Validate phone number
            if (document.getElementById('phone').value.length !== 10) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }

            const userId = localStorage.getItem('userEmail');

            // Show loading states
            showLoading();
            setButtonLoading(true);

            // Form validation
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;
            const pincode = document.getElementById('pincode').value;
            const paymentMethod = document.querySelector('input[name="payment"]:checked');

            if (!name || !email || !phone || !address || !pincode || !paymentMethod) {
                alert('Please fill in all required fields');
                hideLoading();
                setButtonLoading(false);
                return;
            }

            const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            if (cartItems.length === 0) {
                alert('Your cart is empty');
                hideLoading();
                setButtonLoading(false);
                return;
            }

            const orderId = generateOrderId();
            
            const orderData = {
                orderId,
                createdAt: new Date().toISOString(),
                status: 'pending',
                items: cartItems.map(item => ({
                    name: item.title,
                    price: item.price,
                    image: item.image,
                    quantity: item.quantity,
                    size: item.size || 'M'
                })),
                customer: {
                    name,
                    email,
                    phone: `${document.getElementById('countryCode').value}${phone}`,
                    address,
                    pincode
                },
                paymentMethod: paymentMethod.value,
                total: document.getElementById('total').textContent,
                shipping: document.getElementById('shipping').textContent,
                subtotal: document.getElementById('subtotal').textContent,
                timestamp: new Date().toISOString() // Add timestamp
            };

            console.log('Starting order process...', { userId, orderData });
            const firebaseOrderId = await saveOrder(userId, orderData);
            
            if (!firebaseOrderId) {
                throw new Error('Order ID was not generated');
            }

            // Save to localStorage with the actual Firebase document ID
            const confirmationDetails = {
                orderNumber: firebaseOrderId, // Use Firebase document ID
                orderDate: new Date().toISOString(),
                total: orderData.total,
                paymentMethod: paymentMethod.value === 'cod' ? 'Cash on Delivery' : 'Online Payment',
                productName: cartItems[0]?.title || 'Your Order' // Add product name
            };
            localStorage.setItem('lastOrder', JSON.stringify(confirmationDetails));

            // Clear cart and redirect
            localStorage.removeItem('cartItems');
            window.location.href = 'order-placed.html';
        } catch (error) {
            console.error('Detailed checkout error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            let errorMessage = 'There was an error processing your order: ';
            
            if (error.code === 'permission-denied') {
                errorMessage += 'You do not have permission to place orders.';
            } else if (error.code === 'unavailable') {
                errorMessage += 'The service is temporarily unavailable. Please try again later.';
            } else if (error.code === 'resource-exhausted') {
                errorMessage += 'The system is currently busy. Please try again in a few minutes.';
            } else {
                errorMessage += 'Please check your connection and try again.';
            }
            
            if (!isUserLoggedIn()) {
                alert('Please log in to complete your purchase');
                window.location.href = 'login.html';
            } else {
                alert(errorMessage);
            }
            
            hideLoading();
            setButtonLoading(false);
        }
    });

    // Add loading state when page loads
    showLoading();
    
    // Simulate loading time for demonstration
    setTimeout(() => {
        hideLoading();
    }, 1000);

    // Add pincode detection functionality
    const pincodeInput = document.getElementById('pincode');
    const stateInput = document.getElementById('state');
    const cityInput = document.getElementById('city');
    const pincodeStatus = document.getElementById('pincodeStatus');

    let pincodeTimeout;

    pincodeInput.addEventListener('input', function(e) {
        // Clear previous timeout
        if (pincodeTimeout) {
            clearTimeout(pincodeTimeout);
        }

        const pincode = e.target.value;

        // Reset fields if pincode is cleared
        if (!pincode) {
            stateInput.value = '';
            cityInput.value = '';
            pincodeStatus.textContent = '';
            return;
        }

        // Validate pincode format
        if (pincode.length === 6 && /^[0-9]{6}$/.test(pincode)) {
            // Show loading status
            pincodeStatus.textContent = 'Fetching location...';
            pincodeStatus.className = 'pincode-status loading';

            // Add delay to prevent too many API calls
            pincodeTimeout = setTimeout(() => {
                fetchPincodeDetails(pincode);
            }, 500);
        } else {
            pincodeStatus.textContent = 'Please enter a valid 6-digit pincode';
            pincodeStatus.className = 'pincode-status error';
            stateInput.value = '';
            cityInput.value = '';
        }
    });

    async function fetchPincodeDetails(pincode) {
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();

            if (data[0].Status === 'Success') {
                const location = data[0].PostOffice[0];
                stateInput.value = location.State;
                cityInput.value = location.District;
                pincodeStatus.textContent = 'Location detected';
                pincodeStatus.className = 'pincode-status success';
            } else {
                throw new Error('Invalid pincode');
            }
        } catch (error) {
            console.error('Error fetching pincode details:', error);
            pincodeStatus.textContent = 'Invalid pincode. Please check and try again.';
            pincodeStatus.className = 'pincode-status error';
            stateInput.value = '';
            cityInput.value = '';
        }
    }

    // Add these styles to handle readonly inputs
    stateInput.setAttribute('readonly', true);
    cityInput.setAttribute('readonly', true);

    // Add country code validation
    const countryCodeInput = document.getElementById('countryCode');
    
    countryCodeInput.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Ensure it starts with +
        if (!value.startsWith('+')) {
            value = '+' + value;
        }
        
        // Remove any non-digit characters except +
        value = '+' + value.substring(1).replace(/[^\d]/g, '');
        
        // Update the input value
        e.target.value = value;
    });
});

// Function to update totals
function updateTotals(subtotal, shipping) {
    const total = subtotal + shipping;
    
    // Format numbers to Indian currency format
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    document.getElementById('subtotal').textContent = formatter.format(subtotal);
    document.getElementById('shipping').textContent = formatter.format(shipping);
    document.getElementById('total').textContent = formatter.format(total);
}
