// Rooms & Beds Module for Hostel Management System

const Rooms = {
    rooms: {},
    beds: {},
    students: {},
    currentHostelId: null,
    currentEditId: null,
    currentBedId: null,

    // Initialize module
    init: () => {
        console.log('Rooms.init() called');
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            if (user) {
                Auth.currentUser = user;
                console.log('User UID:', user.uid);
                Auth.loadUserProfile(user.uid).then(() => {
                    console.log('User profile loaded. Role:', Auth.userRole);
                    // TEST MODE: Auto-assign role if not found
                    if (!Auth.userRole) {
                        console.log('TEST MODE: Auto-assigning superadmin role');
                        Auth.userRole = 'superadmin';
                    }
                    console.log('Role confirmed:', Auth.userRole);
                    Rooms.setupHostelSelector();
                }).catch(err => {
                    console.error('Error loading user profile:', err);
                    // TEST MODE: Continue anyway
                    console.log('TEST MODE: Continuing without profile');
                    Auth.userRole = 'superadmin';
                    Rooms.setupHostelSelector();
                });
            } else {
                console.log('No user, redirecting to login');
                alert('Please login first');
                window.location.href = 'index.html';
            }
        });
    },

    // Setup hostel selector
    setupHostelSelector: () => {
        const selector = document.getElementById('hostelFilter');
        if (!selector) return;

        // TEST MODE: Show all hostels to any user
        database.ref('hostels').on('value', (snapshot) => {
            const hostels = snapshot.val();
            selector.innerHTML = '<option value="">Select Hostel</option>';
            
            if (hostels) {
                Object.entries(hostels).forEach(([id, hostel]) => {
                    selector.innerHTML += `<option value="${id}">${hostel.name}</option>`;
                });
            }
        });
    },

    // Load rooms for selected hostel
    loadRooms: () => {
        const selector = document.getElementById('hostelFilter');
        const hostelId = selector.value;
        
        Rooms.currentHostelId = hostelId;

        if (!hostelId) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('roomsCard').style.display = 'none';
            document.getElementById('roomStats').style.display = 'none';
            document.getElementById('addRoomBtn').style.display = 'none';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('roomsCard').style.display = 'block';
        document.getElementById('roomStats').style.display = 'grid';
        document.getElementById('addRoomBtn').style.display = 'flex';

        // Load rooms
        database.ref('rooms').orderByChild('hostelId').equalTo(hostelId).on('value', (snapshot) => {
            Rooms.rooms = snapshot.val() || {};
            Rooms.renderRooms();
        });

        // Load beds
        database.ref('beds').on('value', (snapshot) => {
            Rooms.beds = snapshot.val() || {};
            Rooms.renderRooms();
        });

        // Load students for bed assignment display
        database.ref('students').orderByChild('hostelId').equalTo(hostelId).on('value', (snapshot) => {
            Rooms.students = snapshot.val() || {};
            Rooms.renderRooms();
        });
    },

    // Render rooms grid
    renderRooms: async () => {
        const grid = document.getElementById('roomsGrid');
        if (!grid) return;

        const roomsList = Object.entries(Rooms.rooms);

        if (roomsList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <h4>No rooms found</h4>
                    <p>Add your first room to this hostel</p>
                </div>
            `;
            Rooms.updateStats();
            return;
        }

        let html = '';
        roomsList.forEach(([roomId, room]) => {
            const roomBeds = Object.entries(Rooms.beds).filter(([_, bed]) => bed.roomId === roomId);
            const occupiedBeds = roomBeds.filter(([_, bed]) => bed.status === 'occupied').length;
            const vacantBeds = roomBeds.filter(([_, bed]) => bed.status === 'vacant').length;

            html += `
                <div class="room-card">
                    <div class="room-header">
                        <span class="room-number">Room ${room.roomNumber}</span>
                        <span class="badge ${occupiedBeds === roomBeds.length ? 'badge-danger' : 'badge-success'}">
                            ${occupiedBeds}/${roomBeds.length} Occupied
                        </span>
                    </div>
                    <div class="room-body">
                        <p class="text-secondary mb-2">${room.roomType || 'Standard'} • ${room.floor || 'Ground Floor'}</p>
                        ${room.amenities ? `<p class="text-secondary mb-2" style="font-size: 12px;">${room.amenities}</p>` : ''}
                        <div class="beds-grid">
                            ${roomBeds.map(([bedId, bed]) => {
                                const student = bed.studentId ? Rooms.students[bed.studentId] : null;
                                return `
                                    <div class="bed-item ${bed.status}" onclick="Rooms.showBedDetails('${bedId}')">
                                        <strong>Bed ${bed.bedNumber}</strong>
                                        <br>
                                        <small>${bed.status === 'occupied' && student ? student.name : 'Vacant'}</small>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="actions mt-2" style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="btn btn-sm btn-primary" onclick="Rooms.editRoom('${roomId}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="Rooms.deleteRoom('${roomId}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
        Rooms.updateStats();
    },

    // Update statistics
    updateStats: () => {
        const roomsList = Object.keys(Rooms.rooms).length;
        const allBeds = Object.values(Rooms.beds).filter(bed => {
            const room = Object.entries(Rooms.rooms).find(([id, _]) => id === bed.roomId);
            return room !== undefined;
        });
        const totalBeds = allBeds.length;
        const occupiedBeds = allBeds.filter(b => b.status === 'occupied').length;
        const vacantBeds = totalBeds - occupiedBeds;

        document.getElementById('statTotalRooms').textContent = roomsList;
        document.getElementById('statTotalBeds').textContent = totalBeds;
        document.getElementById('statOccupiedBeds').textContent = occupiedBeds;
        document.getElementById('statVacantBeds').textContent = vacantBeds;
    },

    // Open room modal
    openModal: (roomId = null) => {
        if (!Rooms.currentHostelId) {
            Utils.showNotification('Please select a hostel first', 'error');
            return;
        }

        const modal = document.getElementById('roomModal');
        const title = document.getElementById('roomModalTitle');

        Rooms.currentEditId = roomId;

        if (roomId && Rooms.rooms[roomId]) {
            title.textContent = 'Edit Room';
            const room = Rooms.rooms[roomId];
            document.getElementById('roomId').value = roomId;
            document.getElementById('roomNumber').value = room.roomNumber || '';
            document.getElementById('roomType').value = room.roomType || 'standard';
            document.getElementById('totalBeds').value = room.totalBeds || 2;
            document.getElementById('floor').value = room.floor || '';
            document.getElementById('roomAmenities').value = room.amenities || '';
        } else {
            title.textContent = 'Add New Room';
            document.getElementById('roomForm').reset();
            document.getElementById('roomId').value = '';
            document.getElementById('totalBeds').value = 2;
        }

        modal.classList.add('active');
    },

    // Close room modal
    closeModal: () => {
        document.getElementById('roomModal').classList.remove('active');
        Rooms.currentEditId = null;
    },

    // Save room
    saveRoom: async () => {
        console.log('saveRoom called');
        
        const roomNumber = document.getElementById('roomNumber').value.trim();
        const roomType = document.getElementById('roomType').value;
        const totalBeds = parseInt(document.getElementById('totalBeds').value);
        const floor = document.getElementById('floor').value.trim();
        const amenities = document.getElementById('roomAmenities').value.trim();

        console.log('Room form values:', { roomNumber, roomType, totalBeds, floor, amenities, hostelId: Rooms.currentHostelId });

        if (!roomNumber || !totalBeds) {
            Utils.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (!Rooms.currentHostelId) {
            alert('ERROR: No hostel selected. Please select a hostel first.');
            return;
        }

        try {
            const roomData = {
                roomNumber,
                roomType,
                totalBeds,
                floor,
                amenities,
                hostelId: Rooms.currentHostelId,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            console.log('Saving room data:', roomData);

            if (Rooms.currentEditId) {
                // Update existing room
                const oldRoom = Rooms.rooms[Rooms.currentEditId];
                await database.ref(`rooms/${Rooms.currentEditId}`).update(roomData);

                // Adjust beds if count changed
                const currentBeds = Object.entries(Rooms.beds).filter(([_, b]) => b.roomId === Rooms.currentEditId);
                
                if (totalBeds > currentBeds.length) {
                    // Add beds
                    const updates = {};
                    for (let i = currentBeds.length + 1; i <= totalBeds; i++) {
                        const bedId = Utils.generateId('bed_');
                        updates[`beds/${bedId}`] = {
                            bedNumber: i,
                            roomId: Rooms.currentEditId,
                            hostelId: Rooms.currentHostelId,
                            status: 'vacant',
                            studentId: null,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        };
                    }
                    await database.ref().update(updates);
                } else if (totalBeds < currentBeds.length) {
                    // Remove excess vacant beds
                    const bedsToRemove = currentBeds
                        .filter(([_, b]) => b.status === 'vacant')
                        .slice(0, currentBeds.length - totalBeds);
                    
                    for (const [bedId, _] of bedsToRemove) {
                        await database.ref(`beds/${bedId}`).remove();
                    }
                }

                Utils.showNotification('Room updated successfully', 'success');
            } else {
                // Create new room
                roomData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                const roomRef = await database.ref('rooms').push(roomData);
                const roomId = roomRef.key;

                // Create beds for the room
                const bedUpdates = {};
                for (let i = 1; i <= totalBeds; i++) {
                    const bedId = Utils.generateId('bed_');
                    bedUpdates[`beds/${bedId}`] = {
                        bedNumber: i,
                        roomId: roomId,
                        hostelId: Rooms.currentHostelId,
                        status: 'vacant',
                        studentId: null,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                }
                await database.ref().update(bedUpdates);

                Utils.showNotification('Room created successfully', 'success');
            }

            Rooms.closeModal();
        } catch (error) {
            console.error('Error saving room:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert('Error saving room: ' + (error.message || 'Unknown error'));
            Utils.showNotification('Error saving room', 'error');
        }
    },

    // Edit room
    editRoom: (roomId) => {
        Rooms.openModal(roomId);
    },

    // Delete room
    deleteRoom: async (roomId) => {
        if (!confirm('Are you sure you want to delete this room? All beds will be removed.')) {
            return;
        }

        try {
            // Check if any bed is occupied
            const roomBeds = Object.entries(Rooms.beds).filter(([_, b]) => b.roomId === roomId);
            const occupiedBeds = roomBeds.filter(([_, b]) => b.status === 'occupied');

            if (occupiedBeds.length > 0) {
                Utils.showNotification('Cannot delete room with occupied beds', 'error');
                return;
            }

            // Delete beds first
            for (const [bedId, _] of roomBeds) {
                await database.ref(`beds/${bedId}`).remove();
            }

            // Delete room
            await database.ref(`rooms/${roomId}`).remove();
            Utils.showNotification('Room deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting room:', error);
            Utils.showNotification('Error deleting room', 'error');
        }
    },

    // Show bed details
    showBedDetails: (bedId) => {
        const bed = Rooms.beds[bedId];
        if (!bed) return;

        Rooms.currentBedId = bedId;
        const modal = document.getElementById('bedModal');
        const detailsDiv = document.getElementById('bedDetails');

        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4>Bed Information</h4>
                    <p><strong>Bed Number:</strong> ${bed.bedNumber}</p>
                    <p><strong>Status:</strong> ${Utils.getStatusBadge(bed.status)}</p>
                </div>
        `;

        if (bed.status === 'occupied' && bed.studentId && Rooms.students[bed.studentId]) {
            const student = Rooms.students[bed.studentId];
            html += `
                <div>
                    <h4>Student Information</h4>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Phone:</strong> ${student.phone}</p>
                    <p><strong>Join Date:</strong> ${Utils.formatDate(student.joinDate)}</p>
                    <a href="students.html" class="btn btn-sm btn-primary mt-2">View Student</a>
                </div>
            `;
        } else {
            html += `
                <div>
                    <h4>Bed Available</h4>
                    <p class="text-secondary">This bed is currently vacant and ready for assignment.</p>
                    <a href="students.html" class="btn btn-sm btn-success mt-2">Assign Student</a>
                </div>
            `;
        }

        html += '</div>';
        detailsDiv.innerHTML = html;
        modal.classList.add('active');
    },

    // Close bed modal
    closeBedModal: () => {
        document.getElementById('bedModal').classList.remove('active');
        Rooms.currentBedId = null;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Rooms.init();
});

// Close modals on overlay click
document.getElementById('roomModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'roomModal') Rooms.closeModal();
});

document.getElementById('bedModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'bedModal') Rooms.closeBedModal();
});

// Export module
window.Rooms = Rooms;
