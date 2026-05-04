// License Admin Module for Krish Infotech
// Handles license management UI and admin operations

const LicenseAdmin = {
    
    // Initialize admin page
    init: () => {
        LicenseAdmin.loadLicenseStatus();
    },

    // Load and display current license status
    loadLicenseStatus: () => {
        const statusEl = document.getElementById('currentStatus');
        const expiryEl = document.getElementById('expiryDate');
        const daysEl = document.getElementById('daysRemaining');
        const keyEl = document.getElementById('currentKey');
        const badgeEl = document.getElementById('licenseStatusBadge');

        if (!License.currentLicense) {
            if (statusEl) statusEl.textContent = 'No License';
            if (statusEl) statusEl.className = 'text-xl font-bold text-red-600';
            if (expiryEl) expiryEl.textContent = 'N/A';
            if (daysEl) daysEl.textContent = '0';
            if (keyEl) keyEl.textContent = 'No active license';
            if (badgeEl) {
                badgeEl.textContent = 'No License';
                badgeEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
            }
            return;
        }

        const isValid = License.isValid();
        const daysRemaining = License.getDaysRemaining();
        const expiryDate = License.formatExpiryDate();

        if (statusEl) {
            statusEl.textContent = isValid ? 'Active' : 'Expired';
            statusEl.className = isValid ? 'text-xl font-bold text-green-600' : 'text-xl font-bold text-red-600';
        }

        if (expiryEl) expiryEl.textContent = expiryDate;
        if (daysEl) daysEl.textContent = daysRemaining;
        if (keyEl) keyEl.textContent = License.currentLicense.key;

        if (badgeEl) {
            if (isValid) {
                if (daysRemaining <= 7) {
                    badgeEl.textContent = `Expires in ${daysRemaining} days`;
                    badgeEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800';
                } else {
                    badgeEl.textContent = 'License Active';
                    badgeEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
                }
            } else {
                badgeEl.textContent = 'License Expired';
                badgeEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
            }
        }
    },

    // Generate new license
    generateNewLicense: () => {
        const durationSelect = document.getElementById('newLicenseDuration');
        const resultDiv = document.getElementById('newLicenseResult');
        const keyEl = document.getElementById('newLicenseKey');
        const expiryEl = document.getElementById('newLicenseExpiry');

        if (!durationSelect) return;

        const duration = parseInt(durationSelect.value);
        
        // Generate new license
        const license = License.adminGenerateLicense(duration);
        
        // Display result
        if (resultDiv) resultDiv.classList.remove('hidden');
        if (keyEl) keyEl.textContent = license.key;
        if (expiryEl) expiryEl.textContent = License.formatDate(license.expiryDate);

        // Save the new license
        License.saveLicense(license);
        
        // Refresh status display
        LicenseAdmin.loadLicenseStatus();

        Utils.showNotification('New license generated successfully!', 'success');
    },

    // Renew current license
    renewLicense: () => {
        const resultDiv = document.getElementById('renewResult');
        const keyEl = document.getElementById('renewedLicenseKey');
        const expiryEl = document.getElementById('renewedExpiry');

        if (!License.currentLicense) {
            Utils.showNotification('No active license to renew', 'error');
            return;
        }

        // Renew license
        const renewed = License.adminRenewLicense();
        
        if (renewed.error) {
            Utils.showNotification(renewed.error, 'error');
            return;
        }

        // Display result
        if (resultDiv) resultDiv.classList.remove('hidden');
        if (keyEl) keyEl.textContent = renewed.key;
        if (expiryEl) expiryEl.textContent = License.formatDate(renewed.expiryDate);

        // Refresh status display
        LicenseAdmin.loadLicenseStatus();

        Utils.showNotification('License renewed successfully! +1 year added.', 'success');
    },

    // Activate license from input
    activateLicense: () => {
        const input = document.getElementById('activateKeyInput');
        const resultEl = document.getElementById('activateResult');

        if (!input) return;

        const key = input.value.trim();

        if (key.length !== 8) {
            if (resultEl) {
                resultEl.textContent = 'License key must be 8 digits';
                resultEl.className = 'mt-2 text-sm text-red-600';
            }
            return;
        }

        // Decode and validate key
        const decoded = License.decodeKey(key);
        if (!decoded) {
            if (resultEl) {
                resultEl.textContent = 'Invalid license key format';
                resultEl.className = 'mt-2 text-sm text-red-600';
            }
            return;
        }

        // Create expiry date from decoded key
        const expiryDate = new Date(decoded.year, decoded.month - 1, decoded.day, 23, 59, 59, 999);

        // Validate key matches expected format
        if (!License.validateKey(key, expiryDate)) {
            if (resultEl) {
                resultEl.textContent = 'Invalid license key. Please check and try again.';
                resultEl.className = 'mt-2 text-sm text-red-600';
            }
            return;
        }

        // Check if expired
        const now = new Date();
        if (now > expiryDate) {
            if (resultEl) {
                resultEl.textContent = 'This license key has already expired.';
                resultEl.className = 'mt-2 text-sm text-red-600';
            }
            return;
        }

        // Create and save license
        const licenseData = {
            key: key,
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            generatedAt: now.toISOString()
        };

        License.saveLicense(licenseData);

        // Clear input and show success
        input.value = '';
        if (resultEl) {
            resultEl.textContent = 'License activated successfully! Refreshing...';
            resultEl.className = 'mt-2 text-sm text-green-600';
        }

        // Refresh status
        LicenseAdmin.loadLicenseStatus();

        Utils.showNotification('License activated successfully!', 'success');
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    License.init();
    LicenseAdmin.init();
});

window.LicenseAdmin = LicenseAdmin;
