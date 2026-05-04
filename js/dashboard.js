// Dashboard Module for Hostel Management System

const Dashboard = {
    stats: {
        hostels: 0,
        rooms: 0,
        students: 0,
        beds: 0,
        occupiedBeds: 0,
        revenue: 0,
        due: 0,
        pendingPayments: 0
    },

    listeners: [],

    // Initialize dashboard
    init: () => {
        // Check authentication
        auth.onAuthStateChanged((user) => {
            if (user) {
                Auth.currentUser = user;
                Auth.loadUserProfile(user.uid).then(() => {
                    Dashboard.loadData();
                    Dashboard.setupHostelSelector();
                }).catch(() => {
                    // For testing: continue even if profile load fails
                    Dashboard.loadData();
                    Dashboard.setupHostelSelector();
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    },

    // Setup hostel selector for all users (TEST MODE)
    setupHostelSelector: () => {
        const selector = document.getElementById('hostelSelector');
        if (!selector) return;

        // TEST MODE: Show selector to all users
        selector.style.display = 'block';
        
        // Load hostels
        database.ref('hostels').on('value', (snapshot) => {
            const hostels = snapshot.val() || {};
            selector.innerHTML = '<option value="">All Hostels</option>';
            
            Object.entries(hostels).forEach(([id, hostel]) => {
                selector.innerHTML += `<option value="${id}">${hostel.name}</option>`;
            });

            // Restore selection
            const savedHostel = sessionStorage.getItem('currentHostelId');
            if (savedHostel) {
                selector.value = savedHostel;
            }
        });

        selector.addEventListener('change', (e) => {
            Auth.setCurrentHostel(e.target.value);
            Dashboard.loadData();
        });
    },

    // Load all dashboard data
    loadData: async () => {
        Dashboard.showLoading();
        
        try {
            const hostelId = Auth.getCurrentHostelId();
            
            // Load stats in parallel
            await Promise.all([
                Dashboard.loadHostelStats(hostelId),
                Dashboard.loadRoomStats(hostelId),
                Dashboard.loadStudentStats(hostelId),
                Dashboard.loadBedStats(hostelId),
                Dashboard.loadPaymentStats(hostelId),
                Dashboard.loadPendingPayments(hostelId)
            ]);

            Dashboard.updateUI();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            Utils.showNotification('Error loading dashboard data', 'error');
        }
    },

    // Load hostel stats
    loadHostelStats: async (hostelId) => {
        if (hostelId) {
            Dashboard.stats.hostels = 1;
            return;
        }

        const snapshot = await database.ref('hostels').once('value');
        const hostels = snapshot.val() || {};
        Dashboard.stats.hostels = Object.keys(hostels).length;
    },

    // Load room stats
    loadRoomStats: async (hostelId) => {
        let query = database.ref('rooms');
        
        if (hostelId) {
            // Filter by hostel (need to fetch all and filter since RTDB doesn't support complex queries)
            const snapshot = await query.once('value');
            const rooms = snapshot.val() || {};
            Dashboard.stats.rooms = Object.values(rooms).filter(r => r.hostelId === hostelId).length;
        } else {
            const snapshot = await query.once('value');
            const rooms = snapshot.val() || {};
            Dashboard.stats.rooms = Object.keys(rooms).length;
        }
    },

    // Load student stats
    loadStudentStats: async (hostelId) => {
        let query = database.ref('students').orderByChild('status').equalTo('active');
        const snapshot = await query.once('value');
        const students = snapshot.val() || {};
        
        if (hostelId) {
            Dashboard.stats.students = Object.values(students).filter(s => s.hostelId === hostelId).length;
        } else {
            Dashboard.stats.students = Object.keys(students).length;
        }
    },

    // Load bed stats
    loadBedStats: async (hostelId) => {
        let query = database.ref('beds');
        const snapshot = await query.once('value');
        const beds = snapshot.val() || {};
        
        let filteredBeds = Object.values(beds);
        
        if (hostelId) {
            // Get rooms for this hostel first
            const roomsSnapshot = await database.ref('rooms').once('value');
            const rooms = roomsSnapshot.val() || {};
            const hostelRoomIds = Object.entries(rooms)
                .filter(([_, r]) => r.hostelId === hostelId)
                .map(([id, _]) => id);
            
            filteredBeds = filteredBeds.filter(b => hostelRoomIds.includes(b.roomId));
        }
        
        Dashboard.stats.beds = filteredBeds.length;
        Dashboard.stats.occupiedBeds = filteredBeds.filter(b => b.status === 'occupied').length;
    },

    // Load payment stats
    loadPaymentStats: async (hostelId) => {
        const paymentsSnapshot = await database.ref('payments').once('value');
        const payments = paymentsSnapshot.val() || {};
        
        const billsSnapshot = await database.ref('bills').once('value');
        const bills = billsSnapshot.val() || {};

        let totalRevenue = 0;
        let totalDue = 0;
        let pendingCount = 0;

        // Calculate from bills
        Object.values(bills).forEach(bill => {
            if (hostelId && bill.hostelId !== hostelId) return;
            
            totalDue += (bill.dueAmount || 0);
            if (bill.status === 'pending') {
                pendingCount++;
            }
        });

        // Calculate revenue from payments
        Object.values(payments).forEach(payment => {
            if (hostelId && payment.hostelId !== hostelId) return;
            totalRevenue += (payment.amount || 0);
        });

        Dashboard.stats.revenue = totalRevenue;
        Dashboard.stats.due = totalDue;
        Dashboard.stats.pendingPayments = pendingCount;
    },

    // Load pending payments table
    loadPendingPayments: async (hostelId) => {
        const snapshot = await database.ref('bills')
            .orderByChild('status')
            .equalTo('pending')
            .limitToLast(10)
            .once('value');
        
        const bills = snapshot.val() || {};
        const tableBody = document.getElementById('pendingPaymentsTable');
        
        if (!tableBody) return;

        let html = '';
        const promises = [];

        Object.entries(bills).forEach(([billId, bill]) => {
            if (hostelId && bill.hostelId !== hostelId) return;

            // Fetch student info
            const promise = database.ref(`students/${bill.studentId}`).once('value')
                .then(studentSnap => {
                    const student = studentSnap.val();
                    if (!student) return null;

                    // Fetch hostel and room info
                    return Promise.all([
                        database.ref(`hostels/${bill.hostelId}`).once('value'),
                        database.ref(`rooms/${student.roomId}`).once('value')
                    ]).then(([hostelSnap, roomSnap]) => {
                        const hostel = hostelSnap.val();
                        const room = roomSnap.val();

                        return { billId, bill, student, hostel, room };
                    });
                });
            
            promises.push(promise);
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null);

        if (validResults.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No pending payments</td></tr>';
            return;
        }

        validResults.forEach(({ bill, student, hostel, room }) => {
            html += `
                <tr>
                    <td><strong>${student.name}</strong><br><small>${student.phone}</small></td>
                    <td>${hostel ? hostel.name : '-'}</td>
                    <td>${room ? room.roomNumber : '-'}</td>
                    <td>${Utils.getMonthDisplay(bill.month)}</td>
                    <td>${Utils.formatCurrency(bill.rentAmount)}</td>
                    <td>${Utils.formatCurrency(bill.paidAmount || 0)}</td>
                    <td class="text-danger"><strong>${Utils.formatCurrency(bill.dueAmount || 0)}</strong></td>
                    <td>${Utils.getStatusBadge(bill.status)}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Update UI with stats
    updateUI: () => {
        // Update stat cards
        document.getElementById('totalHostels').textContent = Dashboard.stats.hostels;
        document.getElementById('totalRooms').textContent = Dashboard.stats.rooms;
        document.getElementById('totalStudents').textContent = Dashboard.stats.students;
        document.getElementById('totalBeds').textContent = Dashboard.stats.beds;
        document.getElementById('occupiedBeds').textContent = Dashboard.stats.occupiedBeds;
        document.getElementById('totalRevenue').textContent = Utils.formatCurrency(Dashboard.stats.revenue);
        document.getElementById('totalDue').textContent = Utils.formatCurrency(Dashboard.stats.due);
        document.getElementById('pendingPayments').textContent = Dashboard.stats.pendingPayments;

        // Update progress bars
        const occupancyRate = Utils.calculateOccupancy(Dashboard.stats.occupiedBeds, Dashboard.stats.beds);
        const totalExpected = Dashboard.stats.revenue + Dashboard.stats.due;
        const collectionRate = totalExpected > 0 ? Math.round((Dashboard.stats.revenue / totalExpected) * 100) : 0;

        const occupancyBar = document.getElementById('occupancyBar');
        const collectionBar = document.getElementById('collectionBar');

        if (occupancyBar) {
            occupancyBar.style.width = `${occupancyRate}%`;
            occupancyBar.className = `progress-fill ${occupancyRate > 80 ? 'success' : occupancyRate > 50 ? 'warning' : 'danger'}`;
        }

        if (collectionBar) {
            collectionBar.style.width = `${collectionRate}%`;
        }

        document.getElementById('occupancyText').textContent = `${occupancyRate}% occupied (${Dashboard.stats.occupiedBeds}/${Dashboard.stats.beds})`;
        document.getElementById('collectionText').textContent = `${collectionRate}% collected`;
    },

    // Generate monthly bills for all active students
    generateMonthlyBills: async () => {
        if (!confirm('Generate monthly bills for all active students?')) return;

        try {
            const currentMonth = Utils.getCurrentMonth();
            const hostelId = Auth.getCurrentHostelId();

            // Get all active students
            let query = database.ref('students').orderByChild('status').equalTo('active');
            const snapshot = await query.once('value');
            const students = snapshot.val() || {};

            let generated = 0;
            const updates = {};

            for (const [studentId, student] of Object.entries(students)) {
                if (hostelId && student.hostelId !== hostelId) continue;

                // Check if bill already exists for this month
                const billSnapshot = await database.ref('bills')
                    .orderByChild('studentId')
                    .equalTo(studentId)
                    .once('value');
                
                const bills = billSnapshot.val() || {};
                const existingBill = Object.values(bills).find(b => b.month === currentMonth);

                if (!existingBill) {
                    const billId = Utils.generateId('bill_');
                    updates[`bills/${billId}`] = {
                        studentId,
                        hostelId: student.hostelId,
                        month: currentMonth,
                        rentAmount: student.monthlyRent || 0,
                        paidAmount: 0,
                        dueAmount: student.monthlyRent || 0,
                        status: 'pending',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    generated++;
                }
            }

            if (generated > 0) {
                await database.ref().update(updates);
                Utils.showNotification(`Generated ${generated} bills for ${Utils.getMonthDisplay(currentMonth)}`, 'success');
                Dashboard.loadData();
            } else {
                Utils.showNotification('No new bills to generate', 'warning');
            }
        } catch (error) {
            console.error('Error generating bills:', error);
            Utils.showNotification('Error generating bills', 'error');
        }
    },

    // Refresh all data
    refreshData: () => {
        Dashboard.loadData();
        Utils.showNotification('Dashboard refreshed', 'success');
    },

    // Show loading state
    showLoading: () => {
        // Add loading indicators if needed
    },

    // Cleanup listeners
    destroy: () => {
        Dashboard.listeners.forEach(unsubscribe => unsubscribe());
        Dashboard.listeners = [];
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});

// Export Dashboard module
window.Dashboard = Dashboard;
