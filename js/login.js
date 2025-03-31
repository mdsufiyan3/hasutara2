import { auth, db } from './firebase-config.js';
import { BREVO_API_KEY } from './config.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInWithEmailLink, sendSignInLinkToEmail, isSignInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Remove this line since we're importing it from config.js
// const BREVO_API_KEY = process.env.NEXT_PUBLIC_BREVO_API_KEY;

let verificationCode = '';

// Function to send email using Brevo
async function sendEmailWithBrevo(email, code) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    
    const emailTemplate = `
        <html>
        <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-top: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://hasutara.com/image/logo.png" alt="HASUTARA" style="max-width: 150px; height: auto;">
                </div>
                <div style="border-bottom: 2px solid #6B7FD7; margin-bottom: 30px;"></div>
                <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Verify Your Email</h1>
                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
                    Please use the verification code below to complete your login:
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                    <span style="font-size: 32px; letter-spacing: 5px; color: #6B7FD7; font-weight: bold;">${code}</span>
                </div>
                <p style="color: #666666; font-size: 14px; text-align: center; margin-bottom: 30px;">
                    This code will expire in 10 minutes for security purposes.
                </p>
                <div style="border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #999999; font-size: 12px;">
                        If you didn't request this code, please ignore this email.
                        <br>© ${new Date().getFullYear()} HASUTARA. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const data = {
        sender: {
            name: "hasutara",
            email: "mdsufiyanmallick3@gmail.com"  // Replace with your sender email
        },
        to: [{
            email: email
        }],
        subject: "Your HASUTARA Verification Code",
        htmlContent: emailTemplate
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': BREVO_API_KEY
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        console.log('API Response:', responseData); // For debugging

        if (!response.ok) {
            console.error('Error details:', responseData); // For debugging
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('Full error:', error); // For debugging
        throw new Error(`Email sending failed: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailForm');
    const verificationSection = document.getElementById('verificationSection');
    const verifyBtn = document.getElementById('verifyBtn');
    const inputs = document.querySelectorAll('.code-input');

    // Add input handling for verification code boxes
    inputs.forEach((input, index) => {
        // Handle numeric input
        input.addEventListener('input', function(e) {
            // Only allow numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Move to next input if value is entered
            if (this.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        // Handle backspace
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                // Move to previous input on backspace if current input is empty
                inputs[index - 1].focus();
            }
        });

        // Handle paste event
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            
            // Distribute pasted numbers across inputs
            inputs.forEach((input, i) => {
                if (pastedData[i]) {
                    input.value = pastedData[i];
                    if (i < inputs.length - 1) {
                        inputs[i + 1].focus();
                    }
                }
            });
        });
    });

    // Email form submission
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        
        try {
            // Show loading state
            sendCodeBtn.classList.add('loading');
            sendCodeBtn.disabled = true;
            
            // Generate verification code
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Send email using Brevo
            await sendEmailWithBrevo(email, verificationCode);

            localStorage.setItem('userEmail', email);
            localStorage.setItem('verificationCode', verificationCode);
            
            emailForm.style.display = 'none';
            verificationSection.style.display = 'block';
            document.getElementById('emailDisplay').textContent = `Code sent to ${email}`;
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to send code. Please try again.');
        } finally {
            // Remove loading state
            sendCodeBtn.classList.remove('loading');
            sendCodeBtn.disabled = false;
        }
    });

    // Verify button click
    verifyBtn.addEventListener('click', async function() {
        const enteredCode = Array.from(inputs).map(input => input.value).join('');
        const storedCode = localStorage.getItem('verificationCode');
        const email = localStorage.getItem('userEmail');

        try {
            // Show loading state
            verifyBtn.classList.add('loading');
            verifyBtn.disabled = true;

            if (enteredCode === storedCode) {
                try {
                    const email = localStorage.getItem('userEmail');
                    
                    // Create/update user document
                    const userDoc = doc(db, "users", email);
                    await setDoc(userDoc, {
                        email: email,
                        lastLogin: new Date().toISOString()
                    }, { merge: true }); // Use merge to preserve existing data

                    // Initialize cart if it doesn't exist
                    const cartRef = doc(db, `users/${email}/cart/data`);
                    const cartDoc = await getDoc(cartRef);
                    if (!cartDoc.exists()) {
                        await setDoc(cartRef, {
                            items: [],
                            updatedAt: new Date().toISOString()
                        });
                    }

                    // Initialize wishlist if it doesn't exist
                    const wishlistRef = doc(db, `users/${email}/wishlist/data`);
                    const wishlistDoc = await getDoc(wishlistRef);
                    if (!wishlistDoc.exists()) {
                        await setDoc(wishlistRef, {
                            items: [],
                            updatedAt: new Date().toISOString()
                        });
                    }

                    await handleSuccessfulLogin(email);
                } catch (error) {
                    console.error('Login error:', error);
                    alert('Login failed: ' + error.message);
                }
            } else {
                alert('Invalid verification code. Please try again.');
            }
        } finally {
            // Remove loading state
            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;
        }
    });

    // Add this at the beginning of your DOMContentLoaded event
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = localStorage.getItem('userEmail');
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
        }

        signInWithEmailLink(auth, email, window.location.href)
            .then(async (result) => {
                localStorage.setItem('userEmail', email);
                localStorage.setItem('isLoggedIn', 'true');
                // Continue with your existing logic
            })
            .catch((error) => {
                console.error('Error signing in with email link:', error);
            });
    }
});

async function handleSuccessfulLogin(email) {
    try {
        // Remove Firebase email link authentication
        localStorage.setItem('userEmail', email);
        localStorage.setItem('isLoggedIn', 'true');

        // Load cart data
        const cartRef = doc(db, `users/${email}/cart/data`);
        const cartDoc = await getDoc(cartRef);
        if (cartDoc.exists()) {
            localStorage.setItem('cartItems', JSON.stringify(cartDoc.data().items || []));
        } else {
            localStorage.setItem('cartItems', JSON.stringify([]));
        }

        // Load wishlist data
        const wishlistRef = doc(db, `users/${email}/wishlist/data`);
        const wishlistDoc = await getDoc(wishlistRef);
        if (wishlistDoc.exists()) {
            localStorage.setItem('wishlist', JSON.stringify(wishlistDoc.data().items || []));
        } else {
            localStorage.setItem('wishlist', JSON.stringify([]));
        }

        // Enhanced notification sending with debugging
        try {
            console.log('Attempting to send welcome notification...');
            
            // Wait for OneSignal to be ready
            await new Promise(resolve => {
                if (window.OneSignal) {
                    resolve();
                } else {
                    window.OneSignal = window.OneSignal || [];
                    OneSignal.push(() => resolve());
                }
            });

            // Get device state with error handling
            const deviceState = await OneSignal.getDeviceState();
            console.log('OneSignal Device State:', deviceState);

            if (!deviceState) {
                throw new Error('Failed to get OneSignal device state');
            }

            if (!deviceState.userId) {
                console.log('Requesting notification permission...');
                await OneSignal.showNativePrompt();
                // Get updated device state
                const updatedState = await OneSignal.getDeviceState();
                if (!updatedState.userId) {
                    throw new Error('User denied notification permission');
                }
            }

            console.log('Sending notification to user ID:', deviceState.userId);
            
            const response = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic os_v2_app_cnms4e66kbdgfeeix6zyzxkpcwfx726vlmpepdv652xjhst2uug56vmepsclobbgkm72rswzfqjxk4tqn6f5vqjtrps6mrzgnkhyczi'
                },
                body: JSON.stringify({
                    app_id: "13592e13-de50-4662-9088-bfb38cdd4f15",
                    include_player_ids: [deviceState.userId],
                    contents: {
                        en: `Welcome back ${email}! We're glad to see you again.`
                    },
                    headings: {
                        en: "Login Successful"
                    },
                    data: {
                        type: 'success',
                        category: 'updates',
                        timestamp: new Date().toISOString()
                    },
                    // Add these properties for better visibility
                    chrome_web_icon: "image/apple-touch-icon.png",
                    priority: 10,
                    ttl: 30
                })
            });

            const result = await response.json();
            console.log('Notification API Response:', result);

            if (result.errors) {
                throw new Error(JSON.stringify(result.errors));
            }

            console.log('Login notification sent successfully');

        } catch (error) {
            console.error('Detailed notification error:', error);
            // Log the error but don't block login
        }

        // Check if there was a pending checkout
        const checkoutPending = localStorage.getItem('checkoutPending');
        localStorage.removeItem('checkoutPending'); // Clear the flag
        
        // Redirect based on pending checkout
        if (checkoutPending === 'true') {
            window.location.href = 'checkout.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('Login failed: ' + error.message);
    }
}
