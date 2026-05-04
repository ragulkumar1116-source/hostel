// Simple License System - Direct Date Format
// Format: DDMMYYYY (e.g., 23042026)

const License = {
    currentLicense: null,
    LICENSE_KEY: 'hostel_license_key',
    LICENSE_DATA: 'hostel_license_data',

    // Initialize
    init: () => {
        License.loadLicense();
    },

    // Load license from localStorage
    loadLicense: () => {
        const key = localStorage.getItem(License.LICENSE_KEY);
        const data = localStorage.getItem(License.LICENSE_DATA);
        
        if (key && data) {
            License.currentLicense = JSON.parse(data);
            License.currentLicense.key = key;
        }
    },

    // Save license to localStorage
    saveLicense: (licenseData) => {
        localStorage.setItem(License.LICENSE_KEY, licenseData.key);
        localStorage.setItem(License.LICENSE_DATA, JSON.stringify({
            startDate: licenseData.startDate,
            expiryDate: licenseData.expiryDate,
            generatedAt: licenseData.generatedAt
        }));
        License.currentLicense = licenseData;
    },

    // Clear license
    clearLicense: () => {
        localStorage.removeItem(License.LICENSE_KEY);
        localStorage.removeItem(License.LICENSE_DATA);
        License.currentLicense = null;
    },

    // Simple key generation - Direct date format DDMMYYYY
    // Example: 23/04/2026 → 23042026
    generateKey: (date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear().toString();
        return day + month + year;
    },

    // Validate key is correct date format
    validateKey: (key, date) => {
        const expectedKey = License.generateKey(date);
        return key === expectedKey;
    },

    // Decode DDMMYYYY format
    decodeKey: (key) => {
        if (!key || key.length !== 8) return null;
        const day = parseInt(key.substring(0, 2));
        const month = parseInt(key.substring(2, 4));
        const year = parseInt(key.substring(4, 8));
        return { year, month, day };
    },

    // Create new license
    createLicense: (startDate, durationYears = 1) => {
        const start = new Date(startDate);
        const expiry = new Date(start);
        expiry.setFullYear(expiry.getFullYear() + durationYears);
        
        // Set to end of expiry day
        expiry.setHours(23, 59, 59, 999);
        
        const key = License.generateKey(expiry);
        
        return {
            key: key,
            startDate: start.toISOString(),
            expiryDate: expiry.toISOString(),
            generatedAt: new Date().toISOString()
        };
    },

    // Renew license (+1 year from current expiry)
    renewLicense: (currentLicense) => {
        const currentExpiry = new Date(currentLicense.expiryDate);
        const newExpiry = new Date(currentExpiry);
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        newExpiry.setHours(23, 59, 59, 999);
        
        const newKey = License.generateKey(newExpiry);
        
        return {
            key: newKey,
            startDate: currentLicense.startDate,
            expiryDate: newExpiry.toISOString(),
            generatedAt: new Date().toISOString(),
            previousKey: currentLicense.key
        };
    },

    // Check if license is valid
    isValid: () => {
        if (!License.currentLicense) return false;
        
        const now = new Date();
        const expiry = new Date(License.currentLicense.expiryDate);
        
        // Validate key format
        if (!License.validateKey(License.currentLicense.key, expiry)) {
            return false;
        }
        
        return now <= expiry;
    },

    // Get days remaining
    getDaysRemaining: () => {
        if (!License.currentLicense) return 0;
        
        const now = new Date();
        const expiry = new Date(License.currentLicense.expiryDate);
        const diff = expiry - now;
        
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    },

    // Format expiry date for display
    formatExpiryDate: () => {
        if (!License.currentLicense) return 'No License';
        
        const expiry = new Date(License.currentLicense.expiryDate);
        return expiry.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Format date to DD/MM/YYYY
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Show license expired modal
    showExpiredModal: () => {
        const modal = document.getElementById('licenseModal');
        const content = document.getElementById('licenseModalContent');
        
        if (!modal || !content) return;
        
        content.innerHTML = `
            <div class="license-expired">
                <div class="license-icon">⚠️</div>
                <h2>License Expired</h2>
                <p>Your license has expired. Please contact Krish Infotech to renew your license.</p>
                <div class="license-info">
                    <p><strong>Expired on:</strong> ${License.formatExpiryDate()}</p>
                </div>
                <div class="license-actions">
                    <button class="btn btn-primary" onclick="License.showRenewalForm()">
                        Enter New License Key
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    },

    // Show renewal/activation form
    showRenewalForm: () => {
        const content = document.getElementById('licenseModalContent');
        
        content.innerHTML = `
            <div class="license-form">
                <div class="license-icon">🔐</div>
                <h2>License Activation</h2>
                <p>Enter expiry date as license key:</p>
                <div class="form-group">
                    <label>License Key (DDMMYYYY)</label>
                    <input type="text" id="licenseKeyInput" class="form-control" 
                           placeholder="e.g., 23042026" 
                           maxlength="8">
                    <small class="form-text">Format: DDMMYYYY (DayMonthYear)</small>
                </div>
                <div class="license-actions">
                    <button class="btn btn-primary" onclick="License.activateLicense()">
                        Activate
                    </button>
                </div>
                <div id="licenseError" class="license-error" style="display:none;"></div>
            </div>
        `;
    },

    // Activate license from user input
    activateLicense: () => {
        const keyInput = document.getElementById('licenseKeyInput');
        const errorDiv = document.getElementById('licenseError');

        if (!keyInput) return;

        const key = keyInput.value.trim();

        // Check format DDMMYYYY
        if (key.length !== 8 || isNaN(key)) {
            errorDiv.textContent = 'Enter valid 8-digit date (DDMMYYYY)';
            errorDiv.style.display = 'block';
            return;
        }

        // Decode key
        const decoded = License.decodeKey(key);
        if (!decoded) {
            errorDiv.textContent = 'Invalid date format';
            errorDiv.style.display = 'block';
            return;
        }

        // Create expiry date
        const expiryDate = new Date(decoded.year, decoded.month - 1, decoded.day, 23, 59, 59, 999);

        // Check if expired
        const now = new Date();
        if (now > expiryDate) {
            errorDiv.textContent = 'License expired. Generate new key.';
            errorDiv.style.display = 'block';
            return;
        }

        // Save license
        License.saveLicense({
            key: key,
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            generatedAt: now.toISOString()
        });

        // Success
        keyInput.value = '';
        errorDiv.textContent = 'License activated! Refreshing...';
        errorDiv.style.display = 'block';
        errorDiv.className = 'license-success';

        setTimeout(() => window.location.reload(), 1500);
    },

    // Admin: Generate new license
    adminGenerateLicense: (durationYears = 1) => {
        const now = new Date();
        const license = License.createLicense(now, durationYears);
        return license;
    },

    // Admin: Renew existing license
    adminRenewLicense: () => {
        if (!License.currentLicense) {
            return { error: 'No active license to renew' };
        }
        
        const renewed = License.renewLicense(License.currentLicense);
        License.saveLicense(renewed);
        
        return renewed;
    },

    // Check and enforce license before app loads
    enforce: () => {
        License.loadLicense();
        
        if (!License.isValid()) {
            // Create modal if doesn't exist
            if (!document.getElementById('licenseModal')) {
                const modal = document.createElement('div');
                modal.id = 'licenseModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content modal-sm" id="licenseModalContent">
                        <!-- Content will be filled by showExpiredModal or showRenewalForm -->
                    </div>
                `;
                document.body.appendChild(modal);
            }
            
            if (License.currentLicense) {
                License.showExpiredModal();
            } else {
                License.showRenewalForm();
            }
            
            return false;
        }
        
        return true;
    }
};

// Export for use in other modules
window.License = License;
