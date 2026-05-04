// Payments Module for Hostel Management System

const Payments = {
    bills: {},
    payments: {},
    students: {},
    hostels: {},
    currentTab: 'bills',

    // Initialize module
    init: () => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                Auth.currentUser = user;
                Auth.loadUserProfile(user.uid).then(() => {
                    Payments.loadHostels();
                    Payments.loadData();
                    Payments.populateMonthFilter();
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    },

    // Load hostels for filter
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

        monthFilter.innerHTML = '<option value="">All Months</option>';
        months.forEach(m => {
            monthFilter.innerHTML += `<option value="${m.value}">${m.label}</option>`;
        });
    },

    // Load data
    loadData: () => {
        const hostelId = Auth.getCurrentHostelId();

        // Load students
        let studentsQuery;
        if (hostelId) {
            studentsQuery = database.ref('students').orderByChild('hostelId').equalTo(hostelId);
        } else {
            studentsQuery = database.ref('students');
        }

        studentsQuery.on('value', (snapshot) => {
            Payments.students = snapshot.val() || {};
            Payments.renderBills();
            Payments.renderPayments();
        });

        // Load bills
        database.ref('bills').on('value', (snapshot) => {
            Payments.bills = snapshot.val() || {};
            Payments.renderBills();
        });

        // Load payments
        database.ref('payments').on('value', (snapshot) => {
            Payments.payments = snapshot.val() || {};
            Payments.renderPayments();
        });

        // Load hostels for display
        database.ref('hostels').on('value', (snapshot) => {
            Payments.hostels = snapshot.val() || {};
            Payments.renderBills();
            Payments.renderPayments();
        });
    },

    // Switch tab
    switchTab: (tab) => {
        Payments.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        // Show/hide content
        document.getElementById('billsTab').style.display = tab === 'bills' ? 'block' : 'none';
        document.getElementById('paymentsTab').style.display = tab === 'payments' ? 'block' : 'none';
    },

    // Filter data
    filterData: () => {
        Payments.renderBills();
        Payments.renderPayments();
    },

    // Render bills table
    renderBills: () => {
        const tableBody = document.getElementById('billsTable');
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const hostelFilter = document.getElementById('hostelFilter')?.value || '';
        const monthFilter = document.getElementById('monthFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        let billsList = Object.entries(Payments.bills).map(([id, bill]) => ({ id, ...bill }));

        // Apply filters
        if (hostelFilter) {
            billsList = billsList.filter(b => b.hostelId === hostelFilter);
        }

        if (monthFilter) {
            billsList = billsList.filter(b => b.month === monthFilter);
        }

        if (statusFilter) {
            billsList = billsList.filter(b => b.status === statusFilter);
        }

        // Filter by student name
        if (searchTerm) {
            billsList = billsList.filter(bill => {
                const student = Payments.students[bill.studentId];
                return student && student.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        // Sort by month descending
        billsList.sort((a, b) => b.month.localeCompare(a.month));

        if (billsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No bills found</td></tr>`;
            return;
        }

        let html = '';
        billsList.forEach(bill => {
            const student = Payments.students[bill.studentId];
            const hostel = Payments.hostels[bill.hostelId];

            if (!student) return;

            html += `
                <tr>
                    <td>
                        <strong>${student.name}</strong>
                        <br><small class="text-secondary">${student.phone}</small>
                    </td>
                    <td>${hostel ? hostel.name : '-'}</td>
                    <td>${Utils.getMonthDisplay(bill.month)}</td>
                    <td>${Utils.formatCurrency(bill.rentAmount)}</td>
                    <td class="text-success">${Utils.formatCurrency(bill.paidAmount || 0)}</td>
                    <td class="text-danger"><strong>${Utils.formatCurrency(bill.dueAmount || 0)}</strong></td>
                    <td>${Utils.getStatusBadge(bill.status)}</td>
                    <td class="actions">
                        ${bill.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="Payments.recordPaymentForBill('${bill.id}', '${bill.studentId}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                                Pay
                            </button>
                        ` : '<span class="badge badge-success">Paid</span>'}
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Render payments table
    renderPayments: () => {
        const tableBody = document.getElementById('paymentsTable');
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const hostelFilter = document.getElementById('hostelFilter')?.value || '';
        const monthFilter = document.getElementById('monthFilter')?.value || '';

        let paymentsList = Object.entries(Payments.payments).map(([id, payment]) => ({ id, ...payment }));

        // Apply filters
        if (hostelFilter) {
            paymentsList = paymentsList.filter(p => p.hostelId === hostelFilter);
        }

        if (monthFilter) {
            paymentsList = paymentsList.filter(p => p.month === monthFilter);
        }

        // Filter by student name
        if (searchTerm) {
            paymentsList = paymentsList.filter(payment => {
                const student = Payments.students[payment.studentId];
                return student && student.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        // Sort by date descending
        paymentsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (paymentsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No payments found</td></tr>`;
            return;
        }

        let html = '';
        paymentsList.forEach(payment => {
            const student = Payments.students[payment.studentId];
            const hostel = Payments.hostels[payment.hostelId];

            if (!student) return;

            html += `
                <tr>
                    <td>${Utils.formatDate(payment.createdAt)}</td>
                    <td>
                        <strong>${student.name}</strong>
                        <br><small class="text-secondary">${student.phone}</small>
                    </td>
                    <td>${hostel ? hostel.name : '-'}</td>
                    <td>${Utils.getMonthDisplay(payment.month)}</td>
                    <td class="text-success"><strong>${Utils.formatCurrency(payment.amount)}</strong></td>
                    <td>${payment.method ? Payments.formatMethod(payment.method) : '-'}</td>
                    <td>${payment.notes || '-'}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    },

    // Format payment method
    formatMethod: (method) => {
        const methods = {
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer',
            'upi': 'UPI',
            'card': 'Card',
            'cheque': 'Cheque'
        };
        return methods[method] || method;
    },

    // Open payment modal
    openModal: () => {
        const modal = document.getElementById('paymentModal');
        
        // Populate students dropdown
        const studentSelect = document.getElementById('paymentStudent');
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        Object.entries(Payments.students)
            .filter(([_, s]) => s.status === 'active')
            .forEach(([id, student]) => {
                studentSelect.innerHTML += `<option value="${id}">${student.name} - ${student.phone}</option>`;
            });

        // Reset form
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentBill').innerHTML = '<option value="">Select Student First</option>';
        
        modal.classList.add('active');
    },

    // Close modal
    closeModal: () => {
        document.getElementById('paymentModal').classList.remove('active');
    },

    // Load student bills for payment
    loadStudentBills: () => {
        const studentId = document.getElementById('paymentStudent').value;
        const billSelect = document.getElementById('paymentBill');

        if (!studentId) {
            billSelect.innerHTML = '<option value="">Select Student First</option>';
            return;
        }

        // Get pending bills for this student
        const studentBills = Object.entries(Payments.bills)
            .filter(([_, b]) => b.studentId === studentId && b.status === 'pending')
            .map(([id, b]) => ({ id, ...b }));

        if (studentBills.length === 0) {
            billSelect.innerHTML = '<option value="">No pending bills</option>';
            return;
        }

        billSelect.innerHTML = '<option value="">Select Bill</option>';
        studentBills.forEach(bill => {
            billSelect.innerHTML += `<option value="${bill.id}" data-due="${bill.dueAmount}">${Utils.getMonthDisplay(bill.month)} - Due: ${Utils.formatCurrency(bill.dueAmount)}</option>`;
        });
    },

    // Update payment amount based on selected bill
    updatePaymentAmount: () => {
        const billSelect = document.getElementById('paymentBill');
        const selectedOption = billSelect.options[billSelect.selectedIndex];
        const dueAmount = selectedOption.getAttribute('data-due');
        
        if (dueAmount) {
            document.getElementById('paymentAmount').value = dueAmount;
        }
    },

    // Record payment for specific bill
    recordPaymentForBill: (billId, studentId) => {
        const modal = document.getElementById('paymentModal');
        
        // Populate students dropdown
        const studentSelect = document.getElementById('paymentStudent');
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        Object.entries(Payments.students)
            .filter(([_, s]) => s.status === 'active')
            .forEach(([id, student]) => {
                studentSelect.innerHTML += `<option value="${id}" ${id === studentId ? 'selected' : ''}>${student.name} - ${student.phone}</option>`;
            });

        // Load and select bill
        Payments.loadStudentBills();
        
        setTimeout(() => {
            document.getElementById('paymentBill').value = billId;
            Payments.updatePaymentAmount();
        }, 100);

        modal.classList.add('active');
    },

    // Save payment
    savePayment: async () => {
        const studentId = document.getElementById('paymentStudent').value;
        const billId = document.getElementById('paymentBill').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('paymentNotes').value.trim();

        if (!studentId || !billId || !amount) {
            Utils.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const student = Payments.students[studentId];
        const bill = Payments.bills[billId];

        if (!student || !bill) {
            Utils.showNotification('Invalid student or bill', 'error');
            return;
        }

        try {
            // Create payment record
            const paymentId = Utils.generateId('pay_');
            const paymentData = {
                studentId,
                hostelId: student.hostelId,
                billId,
                month: bill.month,
                amount,
                method,
                notes,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: Auth.currentUser.uid
            };

            await database.ref(`payments/${paymentId}`).set(paymentData);

            // Update bill
            const newPaidAmount = (bill.paidAmount || 0) + amount;
            const newDueAmount = Math.max(0, (bill.rentAmount || 0) - newPaidAmount);
            const newStatus = newDueAmount <= 0 ? 'paid' : 'pending';

            await database.ref(`bills/${billId}`).update({
                paidAmount: newPaidAmount,
                dueAmount: newDueAmount,
                status: newStatus,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            // Update student's advance if applicable
            if (student.advancePayment > 0 && newStatus === 'paid') {
                const advanceUsed = student.advanceUsed || 0;
                await database.ref(`students/${studentId}`).update({
                    advanceUsed: advanceUsed + Math.min(amount, student.advancePayment - advanceUsed)
                });
            }

            Utils.showNotification('Payment recorded successfully', 'success');
            Payments.closeModal();
        } catch (error) {
            console.error('Error saving payment:', error);
            Utils.showNotification('Error recording payment', 'error');
        }
    },

    // Generate bills for current month
    generateBills: async () => {
        if (!confirm('Generate bills for current month for all active students?')) return;

        try {
            const currentMonth = Utils.getCurrentMonth();
            const hostelId = Auth.getCurrentHostelId();

            // Get active students
            let studentsQuery;
            if (hostelId) {
                studentsQuery = database.ref('students').orderByChild('hostelId').equalTo(hostelId);
            } else {
                studentsQuery = database.ref('students');
            }

            const snapshot = await studentsQuery.once('value');
            const students = snapshot.val() || {};

            let generated = 0;
            const updates = {};

            for (const [studentId, student] of Object.entries(students)) {
                if (student.status !== 'active') continue;
                if (hostelId && student.hostelId !== hostelId) continue;

                // Check if bill already exists
                const existingBill = Object.values(Payments.bills).find(
                    b => b.studentId === studentId && b.month === currentMonth
                );

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
            } else {
                Utils.showNotification('No new bills to generate', 'warning');
            }
        } catch (error) {
            console.error('Error generating bills:', error);
            Utils.showNotification('Error generating bills', 'error');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Payments.init();
});

// Close modal on overlay click
document.getElementById('paymentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'paymentModal') Payments.closeModal();
});

// Export module
window.Payments = Payments;
