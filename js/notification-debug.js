<<<<<<< HEAD
// Add this to check service worker registration
function checkServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => {
                console.log('Service Worker Registrations:', registrations);
                if (registrations.length === 0) {
                    console.error('No service worker registered!');
                }
            });
    } else {
        console.error('Service Workers not supported!');
    }
}

// Check OneSignal initialization
function checkOneSignal() {
    if (window.OneSignal) {
        window.OneSignal.isPushNotificationsEnabled()
            .then(isEnabled => {
                console.log('Push notifications are enabled:', isEnabled);
                if (!isEnabled) {
                    console.log('Requesting permission...');
                    window.OneSignal.showNativePrompt();
                }
            });

        // Get OneSignal Player ID
        window.OneSignal.getUserId()
            .then(userId => {
                console.log('OneSignal User ID:', userId);
                if (!userId) {
                    console.error('No OneSignal User ID found!');
                }
            });
    } else {
        console.error('OneSignal not initialized!');
    }
}

// Export functions
export { checkServiceWorker, checkOneSignal };

export function checkNotificationStatus() {
    if (!window.OneSignal) {
        console.error('OneSignal not loaded');
        return;
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => {
                console.log('Service Worker registrations:', registrations);
                if (registrations.length === 0) {
                    console.error('No service worker registered');
                }
            });
    }

    // Check OneSignal status
    window.OneSignal.isPushNotificationsEnabled()
        .then(isEnabled => {
            console.log('Push notifications enabled:', isEnabled);
            if (!isEnabled) {
                console.log('Requesting permission...');
                window.OneSignal.showNativePrompt();
            }
        });

    // Get OneSignal User ID
    window.OneSignal.getUserId()
        .then(userId => {
            console.log('OneSignal User ID:', userId);
            if (!userId) {
                console.error('No OneSignal User ID found');
            }
        });
}

// Check notification permission
async function checkPermission() {
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('Error checking notification permission:', error);
        return null;
    }
}

export async function debugOneSignal() {
    try {
        if (!window.OneSignal) {
            console.error('OneSignal not loaded');
            return;
        }

        // Check if push is supported
        const isPushSupported = await window.OneSignal.isPushNotificationsSupported();
        console.log('Push notifications supported:', isPushSupported);

        if (!isPushSupported) {
            console.error('Push notifications not supported by browser');
            return;
        }

        // Check permission status
        const permission = await window.OneSignal.getNotificationPermission();
        console.log('Current permission status:', permission);

        // Check if notifications are enabled
        const isEnabled = await window.OneSignal.isPushNotificationsEnabled();
        console.log('Push notifications enabled:', isEnabled);

        // Get user ID
        const userId = await window.OneSignal.getUserId();
        console.log('OneSignal User ID:', userId);

        // Check service worker registration
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('Service Worker registrations:', registrations);

        return {
            isPushSupported,
            permission,
            isEnabled,
            userId,
            hasServiceWorker: registrations.length > 0
        };
    } catch (error) {
        console.error('Debug error:', error);
        return null;
    }
}

export function customizeNotificationButton() {
    if (window.OneSignal) {
        window.OneSignal.showSlidedownPrompt({
            text: {
                actionMessage: "Get updates on new arrivals and exclusive offers!",
                acceptButton: "Yes, Please!",
                cancelButton: "Maybe Later",
            },
            delay: {
                pageViews: 1,
                timeDelay: 20
            }
        });
    }
}

export async function sendWelcomeNotification(email) {
    try {
        if (window.OneSignal) {
            const userId = await window.OneSignal.getUserId();
            if (userId) {
                return await window.OneSignal.sendSelfNotification(
                    "Welcome to HASUTARA! 🎉",
                    `Hi ${email.split('@')[0]}, welcome to our fashion community!`,
                    "https://hasutara.com/NEW%20ARRIVALS.html",
                    "https://hasutara.com/image/apple-touch-icon.png",
                    {
                        type: "welcome",
                        userId: userId,
                        timestamp: new Date().toISOString()
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error sending welcome notification:', error);
    }
}
=======
// Add this to check service worker registration
function checkServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => {
                console.log('Service Worker Registrations:', registrations);
                if (registrations.length === 0) {
                    console.error('No service worker registered!');
                }
            });
    } else {
        console.error('Service Workers not supported!');
    }
}

// Check OneSignal initialization
function checkOneSignal() {
    if (window.OneSignal) {
        window.OneSignal.isPushNotificationsEnabled()
            .then(isEnabled => {
                console.log('Push notifications are enabled:', isEnabled);
                if (!isEnabled) {
                    console.log('Requesting permission...');
                    window.OneSignal.showNativePrompt();
                }
            });

        // Get OneSignal Player ID
        window.OneSignal.getUserId()
            .then(userId => {
                console.log('OneSignal User ID:', userId);
                if (!userId) {
                    console.error('No OneSignal User ID found!');
                }
            });
    } else {
        console.error('OneSignal not initialized!');
    }
}

// Export functions
export { checkServiceWorker, checkOneSignal };

export function checkNotificationStatus() {
    if (!window.OneSignal) {
        console.error('OneSignal not loaded');
        return;
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => {
                console.log('Service Worker registrations:', registrations);
                if (registrations.length === 0) {
                    console.error('No service worker registered');
                }
            });
    }

    // Check OneSignal status
    window.OneSignal.isPushNotificationsEnabled()
        .then(isEnabled => {
            console.log('Push notifications enabled:', isEnabled);
            if (!isEnabled) {
                console.log('Requesting permission...');
                window.OneSignal.showNativePrompt();
            }
        });

    // Get OneSignal User ID
    window.OneSignal.getUserId()
        .then(userId => {
            console.log('OneSignal User ID:', userId);
            if (!userId) {
                console.error('No OneSignal User ID found');
            }
        });
}

// Check notification permission
async function checkPermission() {
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('Error checking notification permission:', error);
        return null;
    }
}

export async function debugOneSignal() {
    try {
        if (!window.OneSignal) {
            console.error('OneSignal not loaded');
            return;
        }

        // Check if push is supported
        const isPushSupported = await window.OneSignal.isPushNotificationsSupported();
        console.log('Push notifications supported:', isPushSupported);

        if (!isPushSupported) {
            console.error('Push notifications not supported by browser');
            return;
        }

        // Check permission status
        const permission = await window.OneSignal.getNotificationPermission();
        console.log('Current permission status:', permission);

        // Check if notifications are enabled
        const isEnabled = await window.OneSignal.isPushNotificationsEnabled();
        console.log('Push notifications enabled:', isEnabled);

        // Get user ID
        const userId = await window.OneSignal.getUserId();
        console.log('OneSignal User ID:', userId);

        // Check service worker registration
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('Service Worker registrations:', registrations);

        return {
            isPushSupported,
            permission,
            isEnabled,
            userId,
            hasServiceWorker: registrations.length > 0
        };
    } catch (error) {
        console.error('Debug error:', error);
        return null;
    }
}

export function customizeNotificationButton() {
    if (window.OneSignal) {
        window.OneSignal.showSlidedownPrompt({
            text: {
                actionMessage: "Get updates on new arrivals and exclusive offers!",
                acceptButton: "Yes, Please!",
                cancelButton: "Maybe Later",
            },
            delay: {
                pageViews: 1,
                timeDelay: 20
            }
        });
    }
}

export async function sendWelcomeNotification(email) {
    try {
        if (window.OneSignal) {
            const userId = await window.OneSignal.getUserId();
            if (userId) {
                return await window.OneSignal.sendSelfNotification(
                    "Welcome to HASUTARA! 🎉",
                    `Hi ${email.split('@')[0]}, welcome to our fashion community!`,
                    "https://hasutara.com/NEW%20ARRIVALS.html",
                    "https://hasutara.com/image/apple-touch-icon.png",
                    {
                        type: "welcome",
                        userId: userId,
                        timestamp: new Date().toISOString()
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error sending welcome notification:', error);
    }
}
>>>>>>> a7cc94ac0ae81d78165305c0e8c664e7e5e76fbf
