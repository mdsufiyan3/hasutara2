import { db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Overlay helper functions
function showConfirmation(message, onConfirm) {
    const overlay = document.getElementById('confirmationOverlay');
    const messageElement = document.getElementById('confirmationMessage');
    messageElement.textContent = message;
    overlay.classList.add('active');

    const handleYes = () => {
        overlay.classList.remove('active');
        onConfirm();
        cleanup();
    };

    const handleNo = () => {
        overlay.classList.remove('active');
        cleanup();
    };

    const cleanup = () => {
        document.getElementById('confirmYes').removeEventListener('click', handleYes);
        document.getElementById('confirmNo').removeEventListener('click', handleNo);
    };

    document.getElementById('confirmYes').addEventListener('click', handleYes);
    document.getElementById('confirmNo').addEventListener('click', handleNo);
}

function showMessage(title, message) {
    const overlay = document.getElementById('messageOverlay');
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageText').textContent = message;
    overlay.classList.add('active');

    const handleOk = () => {
        overlay.classList.remove('active');
        document.getElementById('messageOk').removeEventListener('click', handleOk);
    };

    document.getElementById('messageOk').addEventListener('click', handleOk);
}

// Function to load users
async function loadUsers() {
    try {
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const usersTableBody = document.getElementById('usersTableBody');
        usersTableBody.innerHTML = '';

        userSnapshot.forEach(doc => {
            const userData = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.name || 'N/A'}</td>
                <td>${userData.email || 'N/A'}</td>
                <td>${userData.phone || 'N/A'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editUser('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error', 'Failed to load users data');
    }
}

// Function to delete user
window.deleteUser = async (userId) => {
    showConfirmation('Are you sure you want to delete this user?', async () => {
        try {
            await deleteDoc(doc(db, 'users', userId));
            loadUsers();
            showMessage('Success', 'User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            showMessage('Error', 'Failed to delete user');
        }
    });
};

// Add new function to show cart data
async function showCartData(userId) {
    const overlay = document.getElementById('cartDataOverlay');
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();

        // Update user info in overlay
        document.getElementById('cartUserName').textContent = `Name: ${userData.name || 'N/A'}`;
        document.getElementById('cartUserEmail').textContent = `Email: ${userData.email || 'N/A'}`;

        // Get cart items
        const cartSnapshot = await getDocs(collection(db, 'users', userId, 'cart'));
        const cartItemsList = document.getElementById('cartItemsList');
        cartItemsList.innerHTML = '';

        if (cartSnapshot.empty) {
            cartItemsList.innerHTML = '<p>No items in cart</p>';
        } else {
            cartSnapshot.forEach(item => {
                const cartItem = item.data();
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <div class="cart-item-details">
                        <img src="${cartItem.image || 'placeholder.jpg'}" alt="${cartItem.name}" class="cart-item-image">
                        <div>
                            <h4>${cartItem.name}</h4>
                            <p>Quantity: ${cartItem.quantity}</p>
                        </div>
                    </div>
                    <div class="cart-item-price">
                        $${cartItem.price}
                    </div>
                `;
                cartItemsList.appendChild(itemElement);
            });
        }

        overlay.classList.add('active');
    } catch (error) {
        console.error('Error loading cart data:', error);
        showMessage('Error', 'Failed to load cart data');
    }
}

// Function to edit user
window.editUser = async (userId) => {
    showCartData(userId);
};

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const closeCartBtn = document.getElementById('closeCartBtn');
    const closeCartOverlay = document.getElementById('closeCartOverlay');
    const cartOverlay = document.getElementById('cartDataOverlay');

    const closeCart = () => cartOverlay.classList.remove('active');
    
    closeCartBtn.addEventListener('click', closeCart);
    closeCartOverlay.addEventListener('click', closeCart);
});