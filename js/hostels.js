// Hostels Module for Hostel Management System

const Hostels = {
    hostels: {},
    currentEditId: null,

    // Initialize module
    init: () => {
        console.log('Hostels.init() called');
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            if (user) {
                Auth.currentUser = user;
                console.log('User UID:', user.uid);
                Auth.loadUserProfile(user.uid).then(() => {
                    console.log('User profile loaded. Role:', Auth.userRole);
                    // TEST MODE: Auto-assign superadmin if no role found
                    if (!Auth.userRole) {
                        console.log('TEST MODE: Auto-assigning superadmin role');
                        Auth.userRole = 'superadmin';
                    }
                    console.log('Role confirmed:', Auth.userRole);
                    Hostels.loadHostels();
                }).catch(err => {
                    console.error('Error loading user profile:', err);
                    // TEST MODE: Continue anyway
                    console.log('TEST MODE: Continuing without profile');
                    Auth.userRole = 'superadmin';
                    Hostels.loadHostels();
                });
            } else {
                console.log('No user, redirecting to login');
                alert('Please login first');
                window.location.href = 'index.html';
            }
        });
    },

    // Load all hostels with stats
    loadHostels: () => {
        database.ref('hostels').on('value', async (snapshot) => {
            Hostels.hostels = snapshot.val() || {};
            await Hostels.renderHostels();
        });
    },

    // Render hostels table
    renderHostels: async () => {
        const tableBody = document.getElementById('hostelsTable');
        const searchTerm = document.getElementById('searchInput')?.value || '';

        let hostelsList = Object.entries(Hostels.hostels).map(([id, hostel]) => ({
            id,
            ...hostel
        }));

        // Apply search filter
        if (searchTerm) {
            hostelsList = Utils.filterBySearch(hostelsList, searchTerm, ['name', 'address', 'phone']);
        }

        if (hostelsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <h4>No hostels found</h4>
                            <p>Add your first hostel to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Get stats for each hostel
        const statsPromises = hostelsList.map(async (hostel) => {
            const [rooms, beds, students] = await Promise.all([
                Hostels.getHostelRoomsCount(hostel.id),
                Hostels.getHostelBedsCount(hostel.id),
                Hostels.getHostelStudentsCount(hostel.id)
            ]);
            return { ...hostel, rooms, beds, students };
        });

        const hostelsWithStats = await Promise.all(statsPromises);

        let html = '';
        hostelsWithStats.forEach(hostel => {
            html += `
                <tr>
                    <td><strong>${hostel.name}</strong></td>
                    <td>${hostel.address}</td>
                    <td>${hostel.phone}</td>
                    <td>${hostel.rooms}</td>
                    <td>${hostel.beds}</td>
                    <td>${hostel.students}</td>
                    <td>${Utils.getStatusBadge(hostel.status || 'active')}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="Hostels.editHostel('${hostel.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Hostels.deleteHostel('${hostel.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Get room count for hostel
    getHostelRoomsCount: async (hostelId) => {
        const snapshot = await database.ref('rooms').orderByChild('hostelId').equalTo(hostelId).once('value');
        const rooms = snapshot.val() || {};
        return Object.keys(rooms).length;
    },

    // Get bed count for hostel
    getHostelBedsCount: async (hostelId) => {
        const roomsSnapshot = await database.ref('rooms').orderByChild('hostelId').equalTo(hostelId).once('value');
        const rooms = roomsSnapshot.val() || {};
        const roomIds = Object.keys(rooms);

        if (roomIds.length === 0) return 0;

        const bedsSnapshot = await database.ref('beds').once('value');
        const beds = bedsSnapshot.val() || {};

        return Object.values(beds).filter(b => roomIds.includes(b.roomId)).length;
    },

    // Get student count for hostel
    getHostelStudentsCount: async (hostelId) => {
        const snapshot = await database.ref('students')
            .orderByChild('hostelId')
            .equalTo(hostelId)
            .once('value');
        const students = snapshot.val() || {};
        return Object.values(students).filter(s => s.status === 'active').length;
    },

    // Filter hostels
    filterHostels: () => {
        Hostels.renderHostels();
    },

    // Open modal for adding/editing
    openModal: (hostelId = null) => {
        const modal = document.getElementById('hostelModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('hostelForm');

        Hostels.currentEditId = hostelId;

        if (hostelId && Hostels.hostels[hostelId]) {
            title.textContent = 'Edit Hostel';
            const hostel = Hostels.hostels[hostelId];
            document.getElementById('hostelId').value = hostelId;
            document.getElementById('hostelName').value = hostel.name || '';
            document.getElementById('hostelAddress').value = hostel.address || '';
            document.getElementById('hostelPhone').value = hostel.phone || '';
            document.getElementById('hostelEmail').value = hostel.email || '';
            document.getElementById('hostelManager').value = hostel.manager || '';
            document.getElementById('hostelStatus').value = hostel.status || 'active';
        } else {
            title.textContent = 'Add New Hostel';
            form.reset();
            document.getElementById('hostelId').value = '';
        }

        modal.classList.add('active');
    },

    // Close modal
    closeModal: () => {
        document.getElementById('hostelModal').classList.remove('active');
        Hostels.currentEditId = null;
    },

    // Save hostel
    saveHostel: async () => {
        console.log('saveHostel called');
        
        const name = document.getElementById('hostelName').value.trim();
        const address = document.getElementById('hostelAddress').value.trim();
        const phone = document.getElementById('hostelPhone').value.trim();
        const email = document.getElementById('hostelEmail').value.trim();
        const manager = document.getElementById('hostelManager').value.trim();
        const status = document.getElementById('hostelStatus').value;

        console.log('Form values:', { name, address, phone, email, manager, status });

        // Validation
        const errors = Utils.validateRequired({
            'Hostel Name': name,
            'Address': address,
            'Phone': phone
        });

        if (errors.length > 0) {
            Utils.showNotification(`Please fill in: ${errors.join(', ')}`, 'error');
            return;
        }

        try {
            const hostelData = {
                name,
                address,
                phone,
                email,
                manager,
                status,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };

            console.log('Saving hostel data:', hostelData);
            console.log('Current user:', Auth.currentUser?.uid);
            console.log('User role:', Auth.userRole);

            if (Hostels.currentEditId) {
                // Update existing
                await database.ref(`hostels/${Hostels.currentEditId}`).update(hostelData);
                Utils.showNotification('Hostel updated successfully', 'success');
            } else {
                // Create new
                hostelData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                hostelData.createdBy = Auth.currentUser?.uid || 'unknown';
                await database.ref('hostels').push(hostelData);
                Utils.showNotification('Hostel created successfully', 'success');
            }

            Hostels.closeModal();
        } catch (error) {
            console.error('Error saving hostel:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            Utils.showNotification(`Error: ${error.message || 'Failed to save hostel'}`, 'error');
        }
    },

    // Edit hostel
    editHostel: (hostelId) => {
        Hostels.openModal(hostelId);
    },

    // Delete hostel
    deleteHostel: async (hostelId) => {
        if (!confirm('Are you sure you want to delete this hostel? This action cannot be undone.')) {
            return;
        }

        try {
            // Check if hostel has rooms or students
            const [roomsSnapshot, studentsSnapshot] = await Promise.all([
                database.ref('rooms').orderByChild('hostelId').equalTo(hostelId).once('value'),
                database.ref('students').orderByChild('hostelId').equalTo(hostelId).once('value')
            ]);

            const rooms = roomsSnapshot.val() || {};
            const students = studentsSnapshot.val() || {};

            if (Object.keys(rooms).length > 0 || Object.keys(students).length > 0) {
                Utils.showNotification('Cannot delete hostel with rooms or students', 'error');
                return;
            }

            await database.ref(`hostels/${hostelId}`).remove();
            Utils.showNotification('Hostel deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting hostel:', error);
            Utils.showNotification('Error deleting hostel', 'error');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Hostels.init();
});

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('hostelModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'hostelModal') {
                Hostels.closeModal();
            }
        });
    }
});

// Export module
window.Hostels = Hostels;
