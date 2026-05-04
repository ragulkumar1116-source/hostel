// Reports Module for Hostel Management System

const Reports = {
    hostels: {},
    students: {},
    rooms: {},
    beds: {},
    bills: {},
    payments: {},

    // Initialize module
    init: () => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                Auth.currentUser = user;
                Auth.loadUserProfile(user.uid).then(() => {
                    if (Auth.userRole === 'staff') {
                        window.location.href = 'dashboard.html';
                        return;
                    }
                    Reports.loadHostels();
                    Reports.populateMonthFilter();
                    Reports.loadData();
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    },

    // Load hostels
    loadHostels: () => {
        // TEST MODE: Show all hostels regardless of role
        database.ref('hostels').on('value', (snapshot) => {
            const hostels = snapshot.val();
            const hostelFilter = document.getElementById('hostelFilter');
            
            if (hostelFilter) {
                hostelFilter.innerHTML = '<option value="">All Hostels</option>';
                
                if (hostels) {
                    Object.entries(hostels).forEach(([id, hostel]) => {
                        hostelFilter.innerHTML += `<option value="${id}">${hostel.name}</option>`;
                    });
                }
            }
        });
    },

    // Populate month filter
    populateMonthFilter: () => {
        const monthFilter = document.getElementById('monthFilter');
        if (!monthFilter) return;

        const months = [];
        const currentDate = new Date();
        
        // Generate last 12 months
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
            months.push({ value, label });
        }

        monthFilter.innerHTML = '<option value="">Current Month</option>';
        months.forEach(m => {
            monthFilter.innerHTML += `<option value="${m.value}">${m.label}</option>`;
        });
    },

    // Load all data
    loadData: () => {
        database.ref('hostels').on('value', (snapshot) => {
            Reports.hostels = snapshot.val() || {};
            Reports.loadReport();
        });

        database.ref('students').on('value', (snapshot) => {
            Reports.students = snapshot.val() || {};
            Reports.loadReport();
        });

        database.ref('rooms').on('value', (snapshot) => {
            Reports.rooms = snapshot.val() || {};
            Reports.loadReport();
        });

        database.ref('beds').on('value', (snapshot) => {
            Reports.beds = snapshot.val() || {};
            Reports.loadReport();
        });

        database.ref('bills').on('value', (snapshot) => {
            Reports.bills = snapshot.val() || {};
            Reports.loadReport();
        });

        database.ref('payments').on('value', (snapshot) => {
            Reports.payments = snapshot.val() || {};
            Reports.loadReport();
        });
    },

    // Load and render report
    loadReport: async () => {
        const hostelId = document.getElementById('hostelFilter')?.value || '';
        const monthFilter = document.getElementById('monthFilter')?.value || '';
        const currentMonth = monthFilter || Utils.getCurrentMonth();

        // Filter data by hostel
        const filteredHostels = hostelId ? { [hostelId]: Reports.hostels[hostelId] } : Reports.hostels;
        
        const hostelStats = [];
        let totalRevenue = 0;
        let totalDue = 0;
        let totalExpected = 0;
        let totalActiveStudents = 0;

        for (const [id, hostel] of Object.entries(filteredHostels)) {
            if (!hostel) continue;

            // Get rooms for this hostel
            const hostelRooms = Object.entries(Reports.rooms)
                .filter(([_, r]) => r.hostelId === id);
            const roomIds = hostelRooms.map(([rid, _]) => rid);

            // Get beds for these rooms
            const hostelBeds = Object.values(Reports.beds)
                .filter(b => roomIds.includes(b.roomId));
            const totalBeds = hostelBeds.length;
            const occupiedBeds = hostelBeds.filter(b => b.status === 'occupied').length;
            const vacantBeds = totalBeds - occupiedBeds;

            // Get active students
            const activeStudents = Object.values(Reports.students)
                .filter(s => s.hostelId === id && s.status === 'active');
            const studentCount = activeStudents.length;

            // Calculate revenue and due for selected month
            const hostelBills = Object.values(Reports.bills)
                .filter(b => b.hostelId === id && b.month === currentMonth);
            
            const expected = hostelBills.reduce((sum, b) => sum + (b.rentAmount || 0), 0);
            const collected = hostelBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
            const due = hostelBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

            // Calculate total revenue from all payments for this hostel
            const hostelPayments = Object.values(Reports.payments)
                .filter(p => p.hostelId === id);
            const hostelTotalRevenue = hostelPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            totalRevenue += hostelTotalRevenue;
            totalDue += due;
            totalExpected += expected;
            totalActiveStudents += studentCount;

            hostelStats.push({
                id,
                name: hostel.name,
                students: studentCount,
                totalBeds,
                occupiedBeds,
                vacantBeds,
                revenue: hostelTotalRevenue,
                due,
                expected,
                collected,
                collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0
            });
        }

        // Update summary cards
        document.getElementById('reportRevenue').textContent = Utils.formatCurrency(totalRevenue);
        document.getElementById('reportDue').textContent = Utils.formatCurrency(totalDue);
        document.getElementById('reportCollection').textContent = 
            totalExpected > 0 ? `${Math.round(((totalExpected - totalDue) / totalExpected) * 100)}%` : '0%';
        document.getElementById('reportActiveStudents').textContent = totalActiveStudents;

        // Render hostel summary table
        Reports.renderHostelTable(hostelStats);

        // Render monthly report
        Reports.renderMonthlyReport(hostelId);
    },

    // Render hostel summary table
    renderHostelTable: (hostelStats) => {
        const tableBody = document.getElementById('reportTable');

        if (hostelStats.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
            return;
        }

        let html = '';
        hostelStats.forEach(stat => {
            html += `
                <tr>
                    <td><strong>${stat.name}</strong></td>
                    <td>${stat.students}</td>
                    <td>${stat.totalBeds}</td>
                    <td>${stat.occupiedBeds}</td>
                    <td>${stat.vacantBeds}</td>
                    <td class="text-success">${Utils.formatCurrency(stat.revenue)}</td>
                    <td class="text-danger">${Utils.formatCurrency(stat.due)}</td>
                    <td>
                        <div class="progress-bar" style="width: 100px; display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <div class="progress-fill ${stat.collectionRate >= 80 ? 'success' : stat.collectionRate >= 50 ? 'warning' : 'danger'}" 
                                 style="width: ${stat.collectionRate}%"></div>
                        </div>
                        ${stat.collectionRate}%
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Render monthly payment report
    renderMonthlyReport: (hostelId) => {
        const tableBody = document.getElementById('monthlyReportTable');
        
        // Get last 6 months of data
        const months = [];
        const currentDate = new Date();
        for (let i = 0; i < 6; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }

        let html = '';
        months.forEach(month => {
            // Filter bills by month and optionally by hostel
            let monthBills = Object.values(Reports.bills).filter(b => b.month === month);
            if (hostelId) {
                monthBills = monthBills.filter(b => b.hostelId === hostelId);
            }

            const expected = monthBills.reduce((sum, b) => sum + (b.rentAmount || 0), 0);
            const collected = monthBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
            const pending = monthBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
            const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

            html += `
                <tr>
                    <td><strong>${Utils.getMonthDisplay(month)}</strong></td>
                    <td>${Utils.formatCurrency(expected)}</td>
                    <td class="text-success">${Utils.formatCurrency(collected)}</td>
                    <td class="text-danger">${Utils.formatCurrency(pending)}</td>
                    <td>
                        <span class="badge ${collectionRate >= 80 ? 'badge-success' : collectionRate >= 50 ? 'badge-warning' : 'badge-danger'}">
                            ${collectionRate}%
                        </span>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Export report as CSV
    exportReport: () => {
        const hostelId = document.getElementById('hostelFilter')?.value || '';
        const monthFilter = document.getElementById('monthFilter')?.value || Utils.getCurrentMonth();

        // Prepare data for export
        const filteredHostels = hostelId ? { [hostelId]: Reports.hostels[hostelId] } : Reports.hostels;
        
        const exportData = [];
        for (const [id, hostel] of Object.entries(filteredHostels)) {
            if (!hostel) continue;

            const hostelRooms = Object.entries(Reports.rooms)
                .filter(([_, r]) => r.hostelId === id);
            const roomIds = hostelRooms.map(([rid, _]) => rid);

            const hostelBeds = Object.values(Reports.beds)
                .filter(b => roomIds.includes(b.roomId));
            
            const activeStudents = Object.values(Reports.students)
                .filter(s => s.hostelId === id && s.status === 'active');

            const hostelPayments = Object.values(Reports.payments)
                .filter(p => p.hostelId === id);
            const totalRevenue = hostelPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            const hostelBills = Object.values(Reports.bills)
                .filter(b => b.hostelId === id && b.month === monthFilter);
            const due = hostelBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

            exportData.push({
                'Hostel Name': hostel.name,
                'Active Students': activeStudents.length,
                'Total Beds': hostelBeds.length,
                'Occupied Beds': hostelBeds.filter(b => b.status === 'occupied').length,
                'Vacant Beds': hostelBeds.filter(b => b.status === 'vacant').length,
                'Total Revenue': totalRevenue,
                'Due Amount': due,
                'Report Month': Utils.getMonthDisplay(monthFilter)
            });
        }

        Utils.exportToCSV(exportData, `hostel_report_${monthFilter}.csv`);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Reports.init();
});

// Export module
window.Reports = Reports;
