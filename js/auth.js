// Authentication Module for Hostel Management System

const Auth = {
    currentUser: null,
    userRole: null,
    currentHostelId: null,

    // Initialize auth
    init: () => {
        auth.onAuthStateChanged((user) => {
            Auth.currentUser = user;
            if (user) {
                Auth.loadUserProfile(user.uid);
            } else {
                Auth.userRole = null;
                Auth.currentHostelId = null;
                Auth.redirectToLogin();
            }
        });
    },

    // Load user profile from database
    loadUserProfile: async (uid) => {
        try {
            const snapshot = await database.ref(`users/${uid}`).once('value');
            const profile = snapshot.val();
            if (profile) {
                Auth.userRole = profile.role;
                Auth.currentHostelId = profile.hostelId || null;
                Auth.updateUIForRole();
                
                // Store in session
                sessionStorage.setItem('userRole', profile.role);
                sessionStorage.setItem('hostelId', profile.hostelId || '');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    },

    // Login with email and password
    login: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            Utils.showNotification('Login successful!', 'success');
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            let message = 'Login failed. Please check your credentials.';
            if (error.code === 'auth/user-not-found') {
                message = 'User not found. Please check your email.';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password. Please try again.';
            }
            Utils.showNotification(message, 'error');
            throw error;
        }
    },

    // Logout
    logout: async () => {
        try {
            await auth.signOut();
            sessionStorage.clear();
            Utils.showNotification('Logged out successfully', 'success');
            Auth.redirectToLogin();
        } catch (error) {
            console.error('Logout error:', error);
            Utils.showNotification('Error logging out', 'error');
        }
    },

    // Register new user (Super Admin only)
    registerUser: async (email, password, name, role, hostelId = null) => {
        try {
            // Check if current user is super admin
            if (Auth.userRole !== 'superadmin') {
                throw new Error('Only Super Admin can create new users');
            }

            // Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // Store user profile in database
            await database.ref(`users/${uid}`).set({
                name,
                email,
                role,
                hostelId: role === 'hosteladmin' ? hostelId : null,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: Auth.currentUser.uid
            });

            // Log the new user out from current session and restore admin session
            // Note: In production, use Firebase Admin SDK for this
            Utils.showNotification('User created successfully', 'success');
            return uid;
        } catch (error) {
            console.error('Registration error:', error);
            Utils.showNotification(error.message || 'Failed to create user', 'error');
            throw error;
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!Auth.currentUser;
    },

    // Check if user has specific role
    hasRole: (roles) => {
        if (!Auth.userRole) return false;
        if (Auth.userRole === 'superadmin') return true;
        return Array.isArray(roles) ? roles.includes(Auth.userRole) : Auth.userRole === roles;
    },

    // Get current user role
    getRole: () => Auth.userRole,

    // Get current hostel ID (for hostel admins)
    getCurrentHostelId: () => Auth.currentHostelId,

    // Set current hostel (for super admin switching)
    setCurrentHostel: (hostelId) => {
        if (Auth.userRole === 'superadmin') {
            Auth.currentHostelId = hostelId;
            sessionStorage.setItem('currentHostelId', hostelId);
        }
    },

    // Redirect to login if not authenticated
    requireAuth: () => {
        if (!Auth.isAuthenticated()) {
            Auth.redirectToLogin();
            return false;
        }
        return true;
    },

    // Redirect to login page
    redirectToLogin: () => {
        if (!window.location.pathname.includes('index.html') && 
            window.location.pathname !== '/' &&
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    },

    // Redirect to dashboard
    redirectToDashboard: () => {
        window.location.href = 'dashboard.html';
    },

    // Update UI based on user role
    updateUIForRole: () => {
        // Hide/show elements based on role
        const superAdminOnly = document.querySelectorAll('.superadmin-only');
        const hostelAdminOnly = document.querySelectorAll('.hosteladmin-only');
        const notForStaff = document.querySelectorAll('.not-for-staff');

        superAdminOnly.forEach(el => {
            el.style.display = Auth.userRole === 'superadmin' ? '' : 'none';
        });

        hostelAdminOnly.forEach(el => {
            el.style.display = (Auth.userRole === 'hosteladmin' || Auth.userRole === 'superadmin') ? '' : 'none';
        });

        notForStaff.forEach(el => {
            el.style.display = Auth.userRole === 'staff' ? 'none' : '';
        });

        // Update user info display
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        
        if (userNameEl && Auth.currentUser) {
            userNameEl.textContent = Auth.currentUser.email;
        }
        if (userRoleEl && Auth.userRole) {
            userRoleEl.textContent = Auth.userRole.charAt(0).toUpperCase() + Auth.userRole.slice(1);
        }
    },

    // Create initial super admin (one-time setup)
    setupSuperAdmin: async (email, password, name) => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            await database.ref(`users/${uid}`).set({
                name,
                email,
                role: 'superadmin',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            return uid;
        } catch (error) {
            console.error('Setup error:', error);
            throw error;
        }
    }
};

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Export Auth module
window.Auth = Auth;
