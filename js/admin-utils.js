import { db, auth } from './firebase-config.js';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const VALID_CATEGORIES = [
    "MAN'S",
    "WOMANS",
    "COUPLE",
    "ACCESSORIES",
    "BOYS"
];

const VALID_SECTIONS = {
    "MAN'S": ["SHIRTS", "TSHIRTS", "JINSE", "BAGGY TROUSER"],
    "WOMANS": ["TOPS", "BOTTOMS", "DRESSES", "OUTERWEAR"],
    "COUPLE": ["OUTFIT-SET", "TSHIRTS-TOPS", "SHIRTS-DRESSES", "JEANS-BOTTOMS", "HOODIES-SET"],
    "ACCESSORIES": ["BAGS", "WATCHES", "JEWELLERY", "BELTS"],
    "BOYS": ["SHIRTS", "TSHIRTS", "JINSE", "BAGGY TROUSER"]
};

// Check if user is admin
async function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('You must be logged in');
    }
    
    // Add console log for debugging
    console.log('Checking admin access for:', user.email);
    
    if (user.email !== 'abufiyan8@gmail.com') {
        console.log('Access denied: not an admin');
        throw new Error('Unauthorized access');
    }
    console.log('Admin access granted');
    return true;
}

// Function to add a product to Firebase
export async function addProduct(productData) {
    try {
        // Check admin access first
        await checkAdminAccess();

        // Validate category and section
        if (!VALID_CATEGORIES.includes(productData.category)) {
            throw new Error('Invalid category');
        }

        if (!VALID_SECTIONS[productData.category].includes(productData.section)) {
            throw new Error(`Invalid section for category ${productData.category}`);
        }

        // Prevent adding new products to MY PRODUCT category
        if (productData.category === 'MY PRODUCT' && !productData.id) {
            throw new Error('Cannot add new products to MY PRODUCT category. Only updates are allowed.');
        }

        // Generate a product ID if not provided
        const productId = productData.id || `HST-${Math.random().toString(36).substr(2, 6)}`;
        
        // Ensure sizes is an array and remove any empty/invalid sizes
        const formattedProduct = {
            ...productData,
            id: productId,
            section: productData.section,
            sizes: (productData.sizes || []).filter(size => size),
            specifications: {
                material: productData.specifications?.material || '',
                color: productData.specifications?.color || '',
                fabric: productData.specifications?.fabric || '',
                care: productData.specifications?.care || '',
                washCare: productData.specifications?.washCare || ''
            },
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser.email
        };

        // Save to Firestore
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, formattedProduct);

        console.log('Product added successfully:', productId);
        return productId;

    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
}

// Add this function to get product details
export async function getProduct(productId) {
    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
            return { id: productSnap.id, ...productSnap.data() };
        }
        throw new Error('Product not found');
    } catch (error) {
        console.error('Error getting product:', error);
        throw error;
    }
}

// Add this function to update product
export async function updateProduct(productId, productData) {
    try {
        await checkAdminAccess();

        // Validate category and section if they're being updated
        if (productData.category && !VALID_CATEGORIES.includes(productData.category)) {
            throw new Error('Invalid category');
        }

        if (productData.category && productData.section && 
            !VALID_SECTIONS[productData.category].includes(productData.section)) {
            throw new Error(`Invalid section for category ${productData.category}`);
        }
        
        const productRef = doc(db, 'products', productId);
        const updatedProduct = {
            ...productData,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.email
        };
        
        await setDoc(productRef, updatedProduct, { merge: true });
        console.log('Product updated successfully:', productId);
        return productId;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

// Add this new function
export async function updateStockLevel(productId, newStockLevel) {
    try {
        await checkAdminAccess();
        
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, {
            stockLevel: Number(newStockLevel),
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.email
        }, { merge: true });
        
        console.log('Stock level updated successfully:', productId);
        return true;
    } catch (error) {
        console.error('Error updating stock level:', error);
        throw error;
    }
}

// Add review to a product
export async function addReview(reviewData) {
    try {
        await checkAdminAccess();
        
        // Convert any image files to Base64 strings if present
        let imageUrls = [];
        if (reviewData.images && reviewData.images.length > 0) {
            for (const imageFile of reviewData.images) {
                try {
                    const base64 = await convertImageToBase64(imageFile);
                    // Store the Base64 string in Firebase
                    imageUrls.push(base64);
                } catch (error) {
                    console.error('Error converting image:', error);
                }
            }
        }
        
        const reviewRef = doc(collection(db, `products/${reviewData.productId}/reviews`));
        await setDoc(reviewRef, {
            ...reviewData,
            id: reviewRef.id,
            images: imageUrls, // Add the image URLs to the review data
            createdAt: new Date().toISOString()
        });

        // Update review count in product document
        const productRef = doc(db, 'products', reviewData.productId);
        await setDoc(productRef, {
            reviewCount: increment(1)
        }, { merge: true });

        return reviewRef.id;
    } catch (error) {
        console.error('Error adding review:', error);
        throw error;
    }
}

// Helper function to convert image file to Base64
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Get reviews for a product
export async function getReviews(productId) {
    try {
        const reviewsRef = collection(db, `products/${productId}/reviews`);
        const reviewsSnapshot = await getDocs(reviewsRef);
        return reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting reviews:', error);
        throw error;
    }
}

// Delete a review
export async function deleteReview(productId, reviewId) {
    try {
        await checkAdminAccess();
        
        await deleteDoc(doc(db, `products/${productId}/reviews/${reviewId}`));
        
        // Update review count in product document
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, {
            reviewCount: increment(-1)
        }, { merge: true });
    } catch (error) {
        console.error('Error deleting review:', error);
        throw error;
    }
}

// Add function to update a review
export async function updateReview(productId, reviewId, reviewData) {
    try {
        await checkAdminAccess();
        
        const reviewRef = doc(db, `products/${productId}/reviews/${reviewId}`);
        await setDoc(reviewRef, {
            ...reviewData,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.email
        }, { merge: true });

        return reviewId;
    } catch (error) {
        console.error('Error updating review:', error);
        throw error;
    }
}

// Example usage:
// Add these example products
export async function addExampleProducts() {
    try {
        await checkAdminAccess();
        
        const products = [
            {
                title: "Couple Matching T-Shirts",
                price: 2999,
                originalPrice: 3999,
                sku: "HST-CPL-001",
                stockLevel: 20,
                images: [
                    "image/couple-tshirt-1.webp",
                    "image/couple-tshirt-2.webp"
                ],
                sizes: ["S", "M", "L", "XL"],
                description: "Matching couple t-shirts made from premium cotton. Perfect for couples who want to show their bond in style.",
                specifications: {
                    material: "100% Cotton",
                    care: "Machine wash cold",
                    fit: "Regular fit",
                },
                category: "COUPLE",
                section: "TSHIRTS-TOPS"
            }
            // Add more products here
        ];

        for (const product of products) {
            try {
                await addProduct(product);
                console.log(`Added product: ${product.title}`);
            } catch (error) {
                console.error(`Error adding product ${product.title}:`, error);

            }
        }
    } catch (error) {
        throw new Error('Unauthorized: Admin access required');
    }
}
