// Students Module for Hostel Management System

const Students = {
    students: {},
    hostels: {},
    rooms: {},
    beds: {},
    currentEditId: null,
    currentStudentId: null,

    // Initialize module
    init: () => {
        // Set default date
        document.getElementById('studentJoinDate').valueAsDate = new Date();

        auth.onAuthStateChanged((user) => {
            if (user) {
                Auth.currentUser = user;
                Auth.loadUserProfile(user.uid).then(() => {
                    Students.loadHostels();
                    Students.loadStudents();
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    },

    // Load hostels for filters and form
    loadHostels: () => {
        // TEST MODE: Load all hostels regardless of role
        database.ref('hostels').on('value', (snapshot) => {
            const hostels = snapshot.val();
            Students.hostels = hostels || {};

            // Populate hostel filters
            const filterSelect = document.getElementById('hostelFilter');
            const formSelect = document.getElementById('studentHostel');
            
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Hostels</option>';
                Object.entries(Students.hostels).forEach(([id, hostel]) => {
                    filterSelect.innerHTML += `<option value="${id}">${hostel.name}</option>`;
                });
            }
        });
    },

    // Load students
    loadStudents: () => {
        const hostelId = Auth.getCurrentHostelId();
        let query;

        if (hostelId) {
            query = database.ref('students').orderByChild('hostelId').equalTo(hostelId);
        } else {
            query = database.ref('students');
        }

        query.on('value', (snapshot) => {
            Students.students = snapshot.val() || {};
            Students.renderStudents();
        });

        // Also load beds for display
        database.ref('beds').on('value', (snapshot) => {
            Students.beds = snapshot.val() || {};
            Students.renderStudents();
        });
    },

    // Render students table
    renderStudents: () => {
        const tableBody = document.getElementById('studentsTable');
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const hostelFilter = document.getElementById('hostelFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        let studentsList = Object.entries(Students.students).map(([id, student]) => ({
            id,
            ...student
        }));

        // Apply filters
        if (searchTerm) {
            studentsList = Utils.filterBySearch(studentsList, searchTerm, ['name', 'phone', 'email']);
        }

        if (hostelFilter) {
            studentsList = studentsList.filter(s => s.hostelId === hostelFilter);
        }

        if (statusFilter) {
            studentsList = studentsList.filter(s => s.status === statusFilter);
        }

        if (studentsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <h4>No students found</h4>
                            <p>Add your first student to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        studentsList.forEach(student => {
            const hostel = Students.hostels[student.hostelId];
            const bed = student.bedId ? Students.beds[student.bedId] : null;
            const room = bed ? Students.rooms[bed.roomId] : null;

            html += `
                <tr>
                    <td>
                        <strong>${student.name}</strong>
                        <br><small class="text-secondary">${student.phone}</small>
                    </td>
                    <td>
                        ${hostel ? hostel.name : '-'}
                        <br><small class="text-secondary">${room ? `Room ${room.roomNumber}` : '-'} ${bed ? `(Bed ${bed.bedNumber})` : ''}</small>
                    </td>
                    <td>${Utils.formatDate(student.joinDate)}</td>
                    <td>${Utils.formatCurrency(student.monthlyRent)}</td>
                    <td>${Utils.formatCurrency(student.advancePayment || 0)}</td>
                    <td>${Utils.getStatusBadge(student.status)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="Students.viewDetails('${student.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="Students.editStudent('${student.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Students.deleteStudent('${student.id}')">
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

    // Filter students
    filterStudents: () => {
        Students.renderStudents();
    },

    // Open student modal
    openModal: (studentId = null) => {
        console.log('Opening student modal. Hostels:', Students.hostels);
        
        const modal = document.getElementById('studentModal');
        const title = document.getElementById('studentModalTitle');
        const formSelect = document.getElementById('studentHostel');

        // Populate hostel dropdown
        formSelect.innerHTML = '<option value="">Select Hostel</option>';
        
        const hostelEntries = Object.entries(Students.hostels);
        console.log('Hostel entries:', hostelEntries);
        
        if (hostelEntries.length === 0) {
            alert('No hostels found. Please add a hostel first!');
            return; // Don't open modal if no hostels
        }
        
        hostelEntries.forEach(([id, hostel]) => {
            formSelect.innerHTML += `<option value="${id}">${hostel.name}</option>`;
        });

        Students.currentEditId = studentId;

        if (studentId && Students.students[studentId]) {
            title.textContent = 'Edit Student';
            const student = Students.students[studentId];
            
            document.getElementById('studentId').value = studentId;
            document.getElementById('studentName').value = student.name || '';
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentEmail').value = student.email || '';
            document.getElementById('studentIdProof').value = student.idProof || '';
            document.getElementById('studentAddress').value = student.address || '';
            document.getElementById('studentHostel').value = student.hostelId || '';
            document.getElementById('studentJoinDate').value = student.joinDate || '';
            document.getElementById('studentRent').value = student.monthlyRent || '';
            document.getElementById('studentAdvance').value = student.advancePayment || 0;
            document.getElementById('studentStatus').value = student.status || 'active';

            // Load beds for selected hostel
            Students.loadAvailableBeds(student.bedId);
        } else {
            title.textContent = 'Add New Student';
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
            document.getElementById('studentJoinDate').valueAsDate = new Date();
            document.getElementById('studentStatus').value = 'active';
        }

        modal.classList.add('active');
    },

    // Close modal
    closeModal: () => {
        document.getElementById('studentModal').classList.remove('active');
        Students.currentEditId = null;
    },

    // Load available beds for hostel
    loadAvailableBeds: async (selectedBedId = null) => {
        const hostelId = document.getElementById('studentHostel').value;
        const bedSelect = document.getElementById('studentBed');
        
        console.log('Loading beds for hostel:', hostelId);
        
        if (!hostelId) {
            bedSelect.innerHTML = '<option value="">Select Hostel First</option>';
            return;
        }
        
        bedSelect.innerHTML = '<option value="">Loading beds...</option>';

        try {
            // Get rooms for this hostel
            const roomsSnapshot = await database.ref('rooms').orderByChild('hostelId').equalTo(hostelId).once('value');
            Students.rooms = roomsSnapshot.val() || {};
            const roomIds = Object.keys(Students.rooms);

            // Get vacant beds for these rooms
            const bedsSnapshot = await database.ref('beds').once('value');
            const allBeds = bedsSnapshot.val() || {};

            bedSelect.innerHTML = '<option value="">Select Bed</option>';

            let bedCount = 0;
            Object.entries(allBeds).forEach(([bedId, bed]) => {
                // Include if: bed is in a room of this hostel AND (vacant OR is the currently assigned bed)
                if (roomIds.includes(bed.roomId) && (bed.status === 'vacant' || bedId === selectedBedId)) {
                    const room = Students.rooms[bed.roomId];
                    const option = document.createElement('option');
                    option.value = bedId;
                    option.textContent = `Room ${room?.roomNumber || '-'} - Bed ${bed.bedNumber}`;
                    if (bedId === selectedBedId) {
                        option.selected = true;
                    }
                    bedSelect.appendChild(option);
                    bedCount++;
                }
            });
            
            console.log(`Loaded ${bedCount} beds for hostel ${hostelId}`);
            
            if (bedCount === 0) {
                bedSelect.innerHTML = '<option value="">No vacant beds in this hostel</option>';
            }
        } catch (error) {
            console.error('Error loading beds:', error);
            bedSelect.innerHTML = '<option value="">Error loading beds</option>';
        }
    },

    // Save student
    saveStudent: async () => {
        const name = document.getElementById('studentName').value.trim();
        const phone = document.getElementById('studentPhone').value.trim();
        const email = document.getElementById('studentEmail').value.trim();
        const idProof = document.getElementById('studentIdProof').value.trim();
        const address = document.getElementById('studentAddress').value.trim();
        const hostelId = document.getElementById('studentHostel').value;
        const bedId = document.getElementById('studentBed').value;
        const joinDate = document.getElementById('studentJoinDate').value;
        const monthlyRent = parseFloat(document.getElementById('studentRent').value) || 0;
        const advancePayment = parseFloat(document.getElementById('studentAdvance').value) || 0;
        const status = document.getElementById('studentStatus').value;

        // Validation
        const errors = Utils.validateRequired({
            'Name': name,
            'Phone': phone,
            'Hostel': hostelId,
            'Bed': bedId,
            'Join Date': joinDate,
            'Monthly Rent': monthlyRent
        });

        if (errors.length > 0) {
            Utils.showNotification(`Please fill in: ${errors.join(', ')}`, 'error');
            return;
        }

        try {
            const bed = Students.beds[bedId];
            const studentData = {
                name,
                phone,
                email,
                idProof,
                address,
                hostelId,
                roomId: bed ? bed.roomId : null,
                bedId,
                joinDate,
                monthlyRent,
                advancePayment,
                status,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (Students.currentEditId) {
                // Update existing student
                const oldStudent = Students.students[Students.currentEditId];
                
                // If bed changed, update old bed to vacant
                if (oldStudent.bedId && oldStudent.bedId !== bedId) {
                    await database.ref(`beds/${oldStudent.bedId}`).update({
                        status: 'vacant',
                        studentId: null
                    });
                }

                await database.ref(`students/${Students.currentEditId}`).update(studentData);
                
                // Update bed assignment
                await database.ref(`beds/${bedId}`).update({
                    status: status === 'active' ? 'occupied' : 'vacant',
                    studentId: status === 'active' ? Students.currentEditId : null
                });

                Utils.showNotification('Student updated successfully', 'success');
            } else {
                // Create new student
                studentData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                const studentRef = await database.ref('students').push(studentData);
                const studentId = studentRef.key;

                // Assign bed
                await database.ref(`beds/${bedId}`).update({
                    status: 'occupied',
                    studentId
                });

                // Create initial bill for current month if advance doesn't cover
                const currentMonth = Utils.getCurrentMonth();
                const billId = Utils.generateId('bill_');
                await database.ref(`bills/${billId}`).set({
                    studentId,
                    hostelId,
                    month: currentMonth,
                    rentAmount: monthlyRent,
                    paidAmount: Math.min(advancePayment, monthlyRent),
                    dueAmount: Math.max(0, monthlyRent - advancePayment),
                    status: advancePayment >= monthlyRent ? 'paid' : 'pending',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                // Deduct advance used from student record
                if (advancePayment > 0) {
                    await database.ref(`students/${studentId}`).update({
                        advanceUsed: Math.min(advancePayment, monthlyRent)
                    });
                }

                Utils.showNotification('Student added successfully', 'success');
            }

            Students.closeModal();
        } catch (error) {
            console.error('Error saving student:', error);
            Utils.showNotification('Error saving student', 'error');
        }
    },

    // Edit student
    editStudent: (studentId) => {
        Students.openModal(studentId);
    },

    // Delete student
    deleteStudent: async (studentId) => {
        const student = Students.students[studentId];
        if (!student) {
            console.error('Student not found:', studentId);
            return;
        }

        if (!confirm(`Are you sure you want to delete student "${student.name}"? This action cannot be undone.`)) {
            return;
        }

        console.log('Deleting student:', studentId, 'Bed ID:', student.bedId);

        try {
            // Free up the bed if assigned
            if (student.bedId) {
                console.log('Freeing up bed:', student.bedId);
                await database.ref(`beds/${student.bedId}`).update({
                    status: 'vacant',
                    studentId: null
                });
            }

            // Delete student
            console.log('Removing student from database:', studentId);
            await database.ref(`students/${studentId}`).remove();

            Utils.showNotification('Student deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting student:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert('Error deleting student: ' + (error.message || error.code || 'Unknown error'));
            Utils.showNotification('Error deleting student', 'error');
        }
    },

    // View student details
    viewDetails: async (studentId) => {
        const student = Students.students[studentId];
        if (!student) return;

        Students.currentStudentId = studentId;
        const modal = document.getElementById('studentDetailsModal');
        const content = document.getElementById('studentDetailsContent');
        const checkoutBtn = document.getElementById('checkoutBtn');

        const hostel = Students.hostels[student.hostelId];
        const bed = student.bedId ? Students.beds[student.bedId] : null;
        const room = bed ? Students.rooms[bed.roomId] : null;

        // Get payment history
        const paymentsSnapshot = await database.ref('payments')
            .orderByChild('studentId')
            .equalTo(studentId)
            .once('value');
        const payments = paymentsSnapshot.val() || {};
        const totalPaid = Object.values(payments).reduce((sum, p) => sum + (p.amount || 0), 0);

        // Get bills
        const billsSnapshot = await database.ref('bills')
            .orderByChild('studentId')
            .equalTo(studentId)
            .once('value');
        const bills = billsSnapshot.val() || {};
        const totalDue = Object.values(bills).reduce((sum, b) => sum + (b.dueAmount || 0), 0);

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div>
                    <h4>Personal Information</h4>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Phone:</strong> ${student.phone}</p>
                    <p><strong>Email:</strong> ${student.email || '-'}</p>
                    <p><strong>ID Proof:</strong> ${student.idProof || '-'}</p>
                    <p><strong>Address:</strong> ${student.address || '-'}</p>
                    <p><strong>Join Date:</strong> ${Utils.formatDate(student.joinDate)}</p>
                </div>
                <div>
                    <h4>Hostel Information</h4>
                    <p><strong>Hostel:</strong> ${hostel ? hostel.name : '-'}</p>
                    <p><strong>Room:</strong> ${room ? room.roomNumber : '-'}</p>
                    <p><strong>Bed:</strong> ${bed ? bed.bedNumber : '-'}</p>
                    <p><strong>Status:</strong> ${Utils.getStatusBadge(student.status)}</p>
                </div>
                <div>
                    <h4>Financial Information</h4>
                    <p><strong>Monthly Rent:</strong> ${Utils.formatCurrency(student.monthlyRent)}</p>
                    <p><strong>Advance Payment:</strong> ${Utils.formatCurrency(student.advancePayment || 0)}</p>
                    <p><strong>Total Paid:</strong> <span class="text-success">${Utils.formatCurrency(totalPaid)}</span></p>
                    <p><strong>Total Due:</strong> <span class="text-danger">${Utils.formatCurrency(totalDue)}</span></p>
                </div>
                <div>
                    <h4>Payment Summary</h4>
                    <p><strong>Number of Payments:</strong> ${Object.keys(payments).length}</p>
                    <p><strong>Pending Bills:</strong> ${Object.values(bills).filter(b => b.status === 'pending').length}</p>
                </div>
            </div>
        `;

        checkoutBtn.style.display = student.status === 'active' ? 'inline-flex' : 'none';
        modal.classList.add('active');
    },

    // Close details modal
    closeDetailsModal: () => {
        document.getElementById('studentDetailsModal').classList.remove('active');
        Students.currentStudentId = null;
    },

    // Checkout student
    checkoutStudent: async () => {
        if (!Students.currentStudentId) return;

        const student = Students.students[Students.currentStudentId];
        
        // Check for pending dues
        const billsSnapshot = await database.ref('bills')
            .orderByChild('studentId')
            .equalTo(Students.currentStudentId)
            .once('value');
        const bills = billsSnapshot.val() || {};
        const pendingBills = Object.values(bills).filter(b => b.status === 'pending');

        if (pendingBills.length > 0) {
            const totalPending = pendingBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
            if (!confirm(`Student has ${Utils.formatCurrency(totalPending)} pending dues. Proceed with checkout?`)) {
                return;
            }
        } else {
            if (!confirm('Are you sure you want to check out this student?')) return;
        }

        try {
            // Update student status
            await database.ref(`students/${Students.currentStudentId}`).update({
                status: 'checked-out',
                checkoutDate: new Date().toISOString().split('T')[0],
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            // Free up bed
            if (student.bedId) {
                await database.ref(`beds/${student.bedId}`).update({
                    status: 'vacant',
                    studentId: null
                });
            }

            Utils.showNotification('Student checked out successfully', 'success');
            Students.closeDetailsModal();
        } catch (error) {
            console.error('Error checking out student:', error);
            Utils.showNotification('Error checking out student', 'error');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Students.init();
});

// Close modals on overlay click
document.getElementById('studentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'studentModal') Students.closeModal();
});

document.getElementById('studentDetailsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'studentDetailsModal') Students.closeDetailsModal();
});

// Export module
window.Students = Students;
