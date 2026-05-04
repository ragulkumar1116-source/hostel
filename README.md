# Hostel Management System

A production-level web application for managing hostels, students, rooms, beds, payments, and monthly billing using Firebase Realtime Database.

## Features

### Multi-Hostel Management
- Create and manage multiple hostels
- Role-based access control (Super Admin, Hostel Admin, Staff)
- Hostel switching for Super Admin

### Room & Bed System
- Add rooms with multiple beds
- Real-time bed status tracking (vacant/occupied)
- Visual room grid with bed occupancy

### Student Management
- Student registration with personal details
- Bed assignment system
- Check-in/check-out functionality
- ID proof and address tracking

### Financial System
- Advance payment tracking
- Monthly rent management
- Automatic bill generation
- Payment history tracking

### Monthly Billing
- Automatic bill generation for all active students
- Due amount calculation
- Payment status tracking (paid/pending)
- Payment reminders for pending dues

### Payment System
- Multiple payment methods (Cash, Bank Transfer, UPI, Card, Cheque)
- Partial payment support
- Automatic bill status update
- Payment receipt tracking

### Dashboard & Analytics
- Real-time statistics
- Revenue and due amount tracking
- Occupancy rates
- Collection rates

### Reports
- Hostel-wise summary reports
- Monthly payment history
- Export to CSV
- Collection rate analytics

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Firebase Realtime Database
- **Authentication:** Firebase Auth
- **Hosting:** Firebase Hosting (recommended)

## Project Structure

```
hostel-management-system/
├── index.html              # Login page
├── dashboard.html          # Main dashboard
├── hostels.html           # Hostel management (Super Admin)
├── rooms.html             # Room & bed management
├── students.html          # Student management
├── payments.html          # Payments & billing
├── reports.html           # Reports & analytics
├── css/
│   └── styles.css         # Main stylesheet
├── js/
│   ├── firebase-config.js # Firebase configuration
│   ├── utils.js           # Utility functions
│   ├── auth.js            # Authentication module
│   ├── dashboard.js       # Dashboard module
│   ├── hostels.js         # Hostel management module
│   ├── rooms.js           # Room management module
│   ├── students.js        # Student management module
│   ├── payments.js        # Payment module
│   └── reports.js         # Reports module
└── README.md              # This file
```

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firebase Authentication (Email/Password)
4. Create a Realtime Database
5. Set database rules (see Security Rules section below)

### 2. Configure Firebase

1. In Firebase Console, go to Project Settings
2. Find your app configuration object
3. Update `js/firebase-config.js` with your credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Set Up Initial Super Admin

To create the first Super Admin user, you'll need to:

1. Enable Email/Password authentication in Firebase Console
2. Create a user with email and password
3. Manually add the user role in the database:

```json
{
  "users": {
    "USER_UID": {
      "name": "Admin Name",
      "email": "admin@hostel.com",
      "role": "superadmin",
      "createdAt": 1234567890000
    }
  }
}
```

Replace `USER_UID` with the actual user ID from Firebase Auth.

## Security Rules

Add these rules to your Firebase Realtime Database:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "hostels": {
      ".indexOn": ["name"]
    },
    "rooms": {
      ".indexOn": ["roomNumber", "hostelId"]
    },
    "beds": {
      ".indexOn": ["roomId", "status"]
    },
    "students": {
      ".indexOn": ["name", "phone", "hostelId", "roomId", "bedId", "status"]
    },
    "bookings": {
      ".indexOn": ["checkIn", "studentId", "hostelId"]
    },
    "payments": {
      ".indexOn": ["studentId", "month", "createdAt"]
    },
    "bills": {
      ".indexOn": ["studentId", "month", "createdAt"]
    }
  }
}
```

## User Roles

### Super Admin
- Full system access
- Can create/manage all hostels
- Can create new users
- View all reports and analytics

### Hostel Admin
- Access to assigned hostel only
- Manage rooms, beds, students
- Record payments
- View hostel-specific reports

### Staff / Warden
- View-only access to student check-in/check-out
- Cannot modify financial data

## Usage Guide

### Getting Started

1. **Login:** Use the credentials created during setup
2. **Create Hostel:** (Super Admin) Go to Hostels page and add your first hostel
3. **Add Rooms:** Go to Rooms page, select hostel, and add rooms with beds
4. **Add Students:** Go to Students page and register students, assigning them to beds
5. **Generate Bills:** Click "Generate Monthly Bills" to create bills for current month
6. **Record Payments:** Go to Payments page and record student payments

### Daily Operations

1. Check Dashboard for pending payments and occupancy status
2. Record new payments as they come in
3. Add new students when they check in
4. Process check-outs when students leave
5. Generate bills at the start of each month

## Default Credentials

For initial setup, you can use:
- **Email:** admin@hostel.com
- **Password:** admin123

**Important:** Change these credentials immediately after first login.

## Data Model

### Hostel
```json
{
  "name": "Hostel Name",
  "address": "Full Address",
  "phone": "Contact Number",
  "email": "Email",
  "manager": "Manager Name",
  "status": "active|inactive",
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

### Room
```json
{
  "roomNumber": "101",
  "roomType": "standard|deluxe|shared|single",
  "totalBeds": 2,
  "floor": "1st Floor",
  "amenities": "AC, WiFi, TV",
  "hostelId": "hostel_id",
  "createdAt": 1234567890000
}
```

### Bed
```json
{
  "bedNumber": 1,
  "roomId": "room_id",
  "hostelId": "hostel_id",
  "status": "vacant|occupied",
  "studentId": "student_id|null",
  "createdAt": 1234567890000
}
```

### Student
```json
{
  "name": "Student Name",
  "phone": "Phone Number",
  "email": "Email",
  "idProof": "ID Number",
  "address": "Full Address",
  "hostelId": "hostel_id",
  "roomId": "room_id",
  "bedId": "bed_id",
  "joinDate": "2026-04-23",
  "monthlyRent": 5000,
  "advancePayment": 10000,
  "advanceUsed": 5000,
  "status": "active|checked-out",
  "checkoutDate": "2026-12-31",
  "createdAt": 1234567890000
}
```

### Bill
```json
{
  "studentId": "student_id",
  "hostelId": "hostel_id",
  "month": "2026-04",
  "rentAmount": 5000,
  "paidAmount": 3000,
  "dueAmount": 2000,
  "status": "pending|paid",
  "createdAt": 1234567890000
}
```

### Payment
```json
{
  "studentId": "student_id",
  "hostelId": "hostel_id",
  "billId": "bill_id",
  "month": "2026-04",
  "amount": 3000,
  "method": "cash|bank_transfer|upi|card|cheque",
  "notes": "Payment notes",
  "createdAt": 1234567890000,
  "createdBy": "user_uid"
}
```

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify Firebase configuration
3. Ensure database rules are properly set
4. Check user role assignments

## Future Enhancements

- SMS/Email notifications for payments
- Student photo upload
- Advanced reporting with charts
- Multi-currency support
- Receipt printing
- Mobile app companion
