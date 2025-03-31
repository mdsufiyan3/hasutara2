import { returnOrder } from './firebase-utils.js';

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.return-order-btn').forEach(btn => {
        btn.addEventListener('click', showReturnConfirmation);
    });
});

function showReturnConfirmation(event) {
    const btn = event.target;
    const orderId = btn.dataset.orderId;
    const confirmationOverlay = document.createElement('div');
    confirmationOverlay.classList.add('confirmation-overlay');
    confirmationOverlay.innerHTML = `
        <div class="confirmation-content">
            <p>Are you sure you want to return this order?</p>
            <button class="confirm-return-btn" data-order-id="${orderId}">Yes, Return Order</button>
            <button class="close-confirmation-overlay">No, Go Back</button>
        </div>
    `;
    document.body.appendChild(confirmationOverlay);
    document.body.style.overflow = 'hidden';

    document.querySelector('.confirm-return-btn').addEventListener('click', handleReturnOrder);
    document.querySelector('.close-confirmation-overlay').addEventListener('click', () => {
        document.body.removeChild(confirmationOverlay);
        document.body.style.overflow = '';
    });
}

async function handleReturnOrder(event) {
    const btn = event.target;
    const orderId = btn.dataset.orderId;
    const userId = localStorage.getItem('userEmail');

    if (!userId) {
        alert('Please login to return the order');
        return;
    }

    try {
        await returnOrder(userId, orderId);
        alert('Order returned successfully');
        document.body.removeChild(document.querySelector('.confirmation-overlay'));
        document.body.style.overflow = '';
        location.reload(); // Refresh the page to update the order status
    } catch (error) {
        console.error('Error returning order:', error);
        alert('Failed to return order. Please try again.');
    }
}
