import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    writeBatch,
    collection, 
    getDocs,
    serverTimestamp,
    addDoc,
    query,
    orderBy,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from "./firebase-config.js";

// Save Cart with proper path
export async function saveCart(userId, cartItems) {
    if (!userId) return;
    const cartRef = doc(db, `users/${userId}/cart/data`);
    await setDoc(cartRef, { 
        items: cartItems,
        updatedAt: new Date().toISOString()
    });
}

// Load Cart
export async function loadCart(userId) {
    if (!userId) return [];
    const cartRef = doc(db, `users/${userId}/cart/data`);
    const cartDoc = await getDoc(cartRef);
    return cartDoc.exists() ? cartDoc.data().items : [];
}

// Add to Cart
export async function addToCart(userId, product) {
    if (!userId) return;
    
    try {
        const cartItems = await loadCart(userId);
        const existingItemIndex = cartItems.findIndex(item => 
            item.title === product.title && item.price === product.price
        );
        
        if (existingItemIndex !== -1) {
            cartItems[existingItemIndex].quantity += 1;
        } else {
            cartItems.push({
                ...product,
                quantity: 1
            });
        }
        
        await saveCart(userId, cartItems);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        return cartItems;
    } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
    }
}

// Save Order
export async function saveOrder(userId, orderData) {
    try {
        const orderRef = await addDoc(collection(db, 'users', userId, 'orders'), orderData);
        return orderRef.id; // Return the Firebase document ID
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

// Add a function to test if orders are working
export async function testOrderSave(userId) {
    try {
        const testOrder = {
            items: [{
                name: "Test Product",
                price: "₹999",
                quantity: 1
            }],
            total: "₹999",
            status: "pending"
        };
        
        const orderId = await saveOrder(userId, testOrder);
        console.log('Test order saved successfully with ID:', orderId);
        return orderId;
    } catch (error) {
        console.error('Test order failed:', error);
        throw error;
    }
}

// Save Wishlist
export async function saveWishlist(userId, wishlistItems) {
    if (!userId) return;
    const wishlistRef = doc(db, `users/${userId}/wishlist/data`);
    await setDoc(wishlistRef, {
        items: wishlistItems,
        updatedAt: new Date().toISOString()
    });
}

// Save Address
export async function saveAddress(userId, addressData) {
    const addressRef = doc(db, `users/${userId}/address`);
    await setDoc(addressRef, addressData);
}

// Load Wishlist
export async function loadWishlist(userId) {
    if (!userId) return [];
    try {
        const wishlistRef = doc(db, `users/${userId}/wishlist/data`);
        const wishlistDoc = await getDoc(wishlistRef);
        return wishlistDoc.exists() ? wishlistDoc.data().items : [];
    } catch (error) {
        console.error('Error loading wishlist:', error);
        return [];
    }
}

export async function loadOrders(userId) {
    if (!userId) return [];
    
    try {
        const ordersRef = collection(db, 'users', userId, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);
        
        return ordersSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

export async function saveReview(orderId, reviewData) {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) throw new Error('User not authenticated');

    try {
        const orderRef = doc(db, `users/${userEmail}/orders/${orderId}`);
        
        // Update the order with review data
        await updateDoc(orderRef, {
            reviewed: true,
            rating: reviewData.rating,
            review: reviewData.review,
            reviewDate: reviewData.reviewDate,
            reviewedBy: userEmail
        });

        // Reload the updated order data
        const updatedOrder = await getDoc(orderRef);
        return updatedOrder.data();
    } catch (error) {
        console.error('Error saving review:', error);
        throw error;
    }
}

export async function getAllProductReviews(productId) {
    try {
        // Get product reviews from products collection
        const productReviewsRef = collection(db, `products/${productId}/reviews`);
        const reviewsSnapshot = await getDocs(productReviewsRef);
        
        const reviews = [];
        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();
            reviews.push({
                id: doc.id,
                ...reviewData,
                date: reviewData.reviewDate,
                verified: true
            });
        });

        // Sort reviews by date
        return reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

// Function to save a product review
export async function saveProductReview(productId, reviewData) {
    try {
        if (!productId) {
            throw new Error('Product ID is required');
        }

        if (!reviewData.userId) {
            throw new Error('User ID is required');
        }

        const userRef = doc(db, `users/${reviewData.userId}/orders/${reviewData.orderId}`);
        const reviewRef = doc(collection(db, `products/${productId}/reviews`));
        
        const finalReviewData = {
            ...reviewData,
            reviewId: reviewRef.id,
            timestamp: new Date().toISOString(),
            status: 'published'
        };

        // First update the order
        await updateDoc(userRef, {
            reviewed: true,
            rating: reviewData.rating,
            review: reviewData.review,
            reviewDate: new Date().toISOString()
        });

        // Then save the review
        await setDoc(reviewRef, finalReviewData);

        console.log('Review saved successfully:', {
            productId,
            reviewId: reviewRef.id,
            userId: reviewData.userId
        });

        return reviewRef.id;
    } catch (error) {
        console.error('Detailed error in saveProductReview:', {
            error: error.message,
            code: error.code,
            productId,
            userId: reviewData?.userId
        });
        throw new Error(`Failed to save review: ${error.message}`);
    }
}

export async function getProductReviews(productId) {
    if (!productId) {
        console.error('No product ID provided');
        return [];
    }

    try {
        console.log('Fetching reviews for product:', productId);
        const allReviews = [];

        // Get all users' orders with reviews for this product
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const ordersRef = collection(db, `users/${userId}/orders`);
            const ordersSnap = await getDocs(ordersRef);

            ordersSnap.docs.forEach(orderDoc => {
                const orderData = orderDoc.data();
                // Check if this order has a review and contains our product
                if (orderData.reviewed && 
                    orderData.items?.some(item => item.id === productId)) {
                    allReviews.push({
                        id: orderDoc.id,
                        userId: userId,
                        userName: orderData.reviewedBy || userId,
                        rating: orderData.rating,
                        review: orderData.review, // This is the review text
                        createdAt: orderData.reviewDate,
                        verified: true
                    });
                    console.log('Found review:', orderData.review); // Debug log
                }
            });
        }

        console.log('All reviews found:', allReviews); // Debug log
        return allReviews;

    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

// Add this new function to fetch reviews from orders
export async function getAllOrderReviews(productId) {
    try {
        // Get all users' orders that contain this product and have reviews
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const allReviews = [];
        
        // For each user
        for (const userDoc of usersSnapshot.docs) {
            const ordersRef = collection(db, `users/${userDoc.id}/orders`);
            const ordersSnapshot = await getDocs(ordersRef);
            
            // For each order
            ordersSnapshot.docs.forEach(orderDoc => {
                const orderData = orderDoc.data();
                // Check if order contains the product and has a review
                if (orderData.reviewed && 
                    orderData.items?.some(item => item.id === productId)) {
                    allReviews.push({
                        ...orderData,
                        userName: orderData.userName || 'Anonymous',
                        orderId: orderDoc.id,
                        userId: userDoc.id,
                        verified: true
                    });
                }
            });
        }

        return allReviews;
    } catch (error) {
        console.error('Error fetching order reviews:', error);
        return [];
    }
}

// Save product changes to Firebase
export async function saveProductChanges(productId, changes) {
    if (!productId) {
        throw new Error('Product ID is required');
    }
    
    try {
        const productRef = doc(db, 'products', productId);
        const data = {
            ...changes,
            updatedAt: new Date().toISOString(),
            id: productId,
            lastModifiedBy: localStorage.getItem('userEmail')
        };
        
        // Use batch write to ensure atomic operation
        const batch = writeBatch(db);
        batch.set(productRef, data, { merge: true });
        await batch.commit();
        
        // Verify the save was successful
        const savedDoc = await getDoc(productRef);
        if (!savedDoc.exists()) {
            throw new Error('Failed to verify save operation');
        }
        
        return true;
    } catch (error) {
        console.error('Error in saveProductChanges:', error);
        throw new Error(`Failed to save changes: ${error.message}`);
    }
}

// Load product changes from Firebase
export async function loadProductChanges(productId) {
    if (!productId) return null;
    
    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        return productDoc.exists() ? productDoc.data() : null;
    } catch (error) {
        console.error('Error loading product changes:', error);
        return null;
    }
}

// Load all products changes
export async function loadAllProductChanges() {
    try {
        const productsRef = collection(db, 'products');
        const productsSnapshot = await getDocs(productsRef);
        const products = {};
        
        productsSnapshot.forEach(doc => {
            products[doc.id] = doc.data();
        });
        
        return products;
    } catch (error) {
        console.error('Error loading all product changes:', error);
        return {};
    }
}

// Function to fetch product details
export async function getProductDetails(productId) {
    if (!productId) throw new Error('Product ID is required');
    
    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            throw new Error('Product not found');
        }
        
        return {
            id: productDoc.id,
            ...productDoc.data()
        };
    } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
    }
}

export async function cancelOrder(userId, orderId) {
    const orderRef = doc(db, `users/${userId}/orders/${orderId}`);
    await updateDoc(orderRef, {
        status: 'cancelled'
    });
}

export async function saveReturnRequest(orderId, reason, returnImage) {
    const userId = localStorage.getItem('userEmail');
    if (!userId) throw new Error('User not authenticated');

    const returnData = {
        orderId,
        reason,
        returnImage: returnImage ? await uploadReturnImage(returnImage) : null,
        createdAt: new Date().toISOString(),
        status: 'pending'
    };

    const returnRef = doc(collection(db, `users/${userId}/returns`));
    await setDoc(returnRef, returnData);
}

export async function returnOrder(userId, orderId) {
    const orderRef = doc(db, `users/${userId}/orders/${orderId}`);
    await updateDoc(orderRef, {
        status: 'returned'
    });
}

async function uploadReturnImage(file) {
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`returns/${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

// Add notification functions
export async function addNotification(userId, notificationData) {
    try {
        if (!userId) throw new Error('User ID is required');
        
        console.log('Adding notification:', {
            userId,
            path: `users/${userId}/notifications`,
            data: notificationData
        });

        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const docRef = await addDoc(notificationsRef, {
            ...notificationData,
            createdAt: serverTimestamp()
        });

        console.log('Notification added successfully:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Detailed notification error:', {
            code: error.code,
            message: error.message,
            userId: userId
        });
        throw error;
    }
}

export async function getNotifications(userId) {
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notificationsRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting notifications:', error);
        throw error;
    }
}

export async function markNotificationAsRead(userId, notificationId) {
    try {
        const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            read: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

export async function deleteNotification(userId, notificationId) {
    try {
        const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
        await deleteDoc(notificationRef);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}