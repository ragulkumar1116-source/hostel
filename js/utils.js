// Utility Functions for Hostel Management System

const Utils = {
    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    },

    // Format date
    formatDate: (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format month string (e.g., "April 2026")
    formatMonth: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long'
        });
    },

    // Get current month string
    getCurrentMonth: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    // Get month display name from YYYY-MM format
    getMonthDisplay: (monthStr) => {
        if (!monthStr) return '-';
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long'
        });
    },

    // Generate unique ID
    generateId: (prefix = '') => {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification: (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : '!'}</span>
            <span class="notification-message">${message}</span>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Validate required fields
    validateRequired: (fields) => {
        const errors = [];
        for (const [key, value] of Object.entries(fields)) {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                errors.push(key);
            }
        }
        return errors;
    },

    // Calculate due amount
    calculateDue: (monthlyRent, totalPaid, advanceUsed = 0) => {
        const totalDue = monthlyRent - totalPaid - advanceUsed;
        return Math.max(0, totalDue);
    },

    // Check if user has role access
    hasRoleAccess: (userRole, requiredRoles) => {
        if (!userRole) return false;
        if (userRole === 'superadmin') return true;
        return requiredRoles.includes(userRole);
    },

    // Filter data by search term
    filterBySearch: (data, searchTerm, fields) => {
        if (!searchTerm) return data;
        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && String(value).toLowerCase().includes(term);
            });
        });
    },

    // Paginate data
    paginate: (data, page, perPage = 10) => {
        const start = (page - 1) * perPage;
        const end = start + perPage;
        return {
            data: data.slice(start, end),
            total: data.length,
            pages: Math.ceil(data.length / perPage),
            currentPage: page
        };
    },

    // Export data as CSV
    exportToCSV: (data, filename) => {
        if (!data || data.length === 0) {
            Utils.showNotification('No data to export', 'error');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                const val = row[h] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },

    // Deep clone object
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

    // Calculate occupancy percentage
    calculateOccupancy: (occupied, total) => {
        if (!total) return 0;
        return Math.round((occupied / total) * 100);
    },

    // Get status badge HTML
    getStatusBadge: (status) => {
        const statusClasses = {
            'active': 'badge-success',
            'checked-out': 'badge-secondary',
            'pending': 'badge-warning',
            'paid': 'badge-success',
            'vacant': 'badge-success',
            'occupied': 'badge-primary'
        };
        return `<span class="badge ${statusClasses[status] || 'badge-secondary'}">${status}</span>`;
    }
};

// Export Utils
window.Utils = Utils;
