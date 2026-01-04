# Firebase Setup Guide for Household Budget Management System

## Prerequisites
- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Angular Fire already installed via `ng add @angular/fire`

## Step 1: Enable Authentication

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Email/Password** provider
3. Click Save

## Step 2: Create Firestore Database

1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in **test mode**" (we'll add rules later)
4. Select your preferred region
5. Click Enable

## Step 3: Deploy Firestore Security Rules

Run the following command to deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

Or manually copy the contents of `firestore.rules` to Firebase Console → Firestore → Rules.

## Step 4: Create Initial Users

### Option A: Using Firebase Console

1. Go to Firebase Console → Authentication → Users
2. Click "Add user" for each of these accounts:

| Email | Password | Role (set in Firestore) |
|-------|----------|-------------------------|
| admin@family.com | password123 | admin |
| sister1@family.com | password123 | user |
| sister2@family.com | password123 | user |
| sister3@family.com | password123 | user |
| mother@family.com | password123 | viewer |

3. After creating users in Authentication, go to Firestore Database
4. Create a `users` collection
5. For each user, create a document with the user's UID as the document ID:

```json
{
  "name": "Admin (Budget Holder)",
  "email": "admin@family.com",
  "role": "admin",
  "isActive": true,
  "createdAt": "<timestamp>"
}
```

### Option B: Using the Seed Script

Run the seed script (requires Node.js and firebase-admin):

```bash
cd scripts
npm install
node seed-data.js
```

## Step 5: Create Initial Budget (Optional)

You can create an initial budget for the current month through the admin dashboard, or manually add to Firestore:

```json
// Collection: budgets
{
  "month": 7,  // Current month (1-12)
  "year": 2025,
  "totalIncome": 50000,
  "categories": [
    {
      "id": "cat-1",
      "type": "food",
      "name": "Food & Groceries",
      "monthlyLimit": 15000,
      "spent": 0,
      "warningThreshold": 0.8,
      "icon": "bi-cart",
      "color": "success"
    },
    // ... other categories
  ],
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

## Step 6: Test the Application

1. Start the development server:
   ```bash
   ng serve --open
   ```

2. Log in with one of the created accounts
3. Test the role-based access:
   - **Admin**: Full access to all features
   - **User**: Can submit expenses, view own allowance
   - **Viewer**: Read-only access to view budgets and expenses

## Firestore Collections Structure

```
firestore/
├── users/                    # User profiles (keyed by Firebase Auth UID)
│   └── {userId}
│       ├── name: string
│       ├── email: string
│       ├── role: 'admin' | 'user' | 'viewer'
│       ├── isActive: boolean
│       └── createdAt: timestamp
│
├── budgets/                  # Monthly budgets
│   └── {budgetId}
│       ├── month: number
│       ├── year: number
│       ├── totalIncome: number
│       ├── categories: array
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── expenses/                 # Expense requests
│   └── {expenseId}
│       ├── userId: string
│       ├── userName: string
│       ├── amount: number
│       ├── category: string
│       ├── description: string
│       ├── date: timestamp
│       ├── status: 'pending' | 'approved' | 'rejected'
│       ├── isRecurring: boolean
│       ├── approvedBy?: string
│       ├── approvedAt?: timestamp
│       ├── rejectionReason?: string
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── recurringExpenses/        # Recurring expense definitions
│   └── {recurringId}
│       ├── userId: string
│       ├── userName: string
│       ├── amount: number
│       ├── category: string
│       ├── description: string
│       ├── dayOfMonth: number
│       ├── isActive: boolean
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── allowances/               # Monthly allowances
│   └── {allowanceId}
│       ├── userId: string
│       ├── userName: string
│       ├── monthlyAmount: number
│       ├── spent: number
│       ├── month: number
│       ├── year: number
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
└── allowanceTransactions/    # Allowance spending log
    └── {transactionId}
        ├── allowanceId: string
        ├── userId: string
        ├── amount: number
        ├── description: string
        ├── date: timestamp
        └── createdAt: timestamp
```

## Troubleshooting

### "Permission denied" errors
- Make sure the user profile exists in Firestore `users` collection
- Verify the user's role is correctly set
- Check that Firestore rules are deployed

### Login fails
- Verify the user exists in Firebase Authentication
- Check the password is correct
- Look at browser console for specific error messages

### Data not loading
- Check browser console for Firestore errors
- Verify you're authenticated
- Check network tab for failed requests

## Environment Configuration

Your `app.config.ts` should have the Firebase configuration:

```typescript
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

export const appConfig = {
  providers: [
    // ... other providers
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ]
};
```
