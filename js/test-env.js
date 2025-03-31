<<<<<<< HEAD
import { EMAIL_CONFIG } from './email-config.js';

console.log('Testing Environment Variables:');
console.log('----------------------------------------');
console.log('BREVO_API_KEY:', EMAIL_CONFIG.BREVO_API_KEY ? '✓ Loaded' : '✗ Missing');
console.log('SENDER_EMAIL:', EMAIL_CONFIG.SENDER_EMAIL ? '✓ Loaded' : '✗ Missing');
console.log('SENDER_NAME:', EMAIL_CONFIG.SENDER_NAME ? '✓ Loaded' : '✗ Missing');
console.log('----------------------------------------');

// Verify the values (showing only first/last 4 chars of API key for security)
console.log('\nValue Verification (Partial):');
console.log('----------------------------------------');
if (EMAIL_CONFIG.BREVO_API_KEY) {
    const key = EMAIL_CONFIG.BREVO_API_KEY;
    console.log('API Key:', `${key.substring(0, 4)}...${key.slice(-4)}`);
}
console.log('Sender Email:', EMAIL_CONFIG.SENDER_EMAIL);
console.log('Sender Name:', EMAIL_CONFIG.SENDER_NAME);
=======
import { EMAIL_CONFIG } from './email-config.js';

console.log('Testing Environment Variables:');
console.log('----------------------------------------');
console.log('BREVO_API_KEY:', EMAIL_CONFIG.BREVO_API_KEY ? '✓ Loaded' : '✗ Missing');
console.log('SENDER_EMAIL:', EMAIL_CONFIG.SENDER_EMAIL ? '✓ Loaded' : '✗ Missing');
console.log('SENDER_NAME:', EMAIL_CONFIG.SENDER_NAME ? '✓ Loaded' : '✗ Missing');
console.log('----------------------------------------');

// Verify the values (showing only first/last 4 chars of API key for security)
console.log('\nValue Verification (Partial):');
console.log('----------------------------------------');
if (EMAIL_CONFIG.BREVO_API_KEY) {
    const key = EMAIL_CONFIG.BREVO_API_KEY;
    console.log('API Key:', `${key.substring(0, 4)}...${key.slice(-4)}`);
}
console.log('Sender Email:', EMAIL_CONFIG.SENDER_EMAIL);
console.log('Sender Name:', EMAIL_CONFIG.SENDER_NAME);
>>>>>>> a7cc94ac0ae81d78165305c0e8c664e7e5e76fbf
