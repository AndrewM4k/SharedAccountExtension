// AuthService - Deprecated
// Authentication is now handled by background.js via backend API
// This file is kept for backward compatibility but should not be used
export class AuthService {
    constructor() {
        // Credentials removed - use backend API instead
        // Authentication is handled by background.js -> authenticateWithBackend()
        console.warn('AuthService is deprecated. Use background.js authentication instead.');
    }
    async authOnCopart() {
        console.warn('authOnCopart() is deprecated. Use background.js authAndSetCookies action instead.');
        // Redirect to background script authentication
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'authAndSetCookies' }, (response) => {
                resolve(response?.success || false);
            });
        });
    }
}
// Note: This class is deprecated. Authentication should be done via:
// chrome.runtime.sendMessage({ action: 'authAndSetCookies' })
