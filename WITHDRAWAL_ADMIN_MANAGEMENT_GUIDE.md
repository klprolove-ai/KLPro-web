# Admin Withdrawal Management System - Quick Start Guide

## How It Works (User Perspective)

### Professional (Withdrawal Requester)

1. Open **💰 Wallet Management** from professional dashboard
2. Click **Withdrawal** tab
3. Enter amount and select withdrawal method (Bank Transfer, Net Banking, or UPI)
4. Submit request
5. **Status becomes "pending"** - waiting for admin approval
6. Can see status in **Transaction History** tab

### Admin (Withdrawal Manager)

1. Go to **Admin Dashboard**
2. Click **🏦 Withdrawals** in sidebar
3. View withdrawal requests by status:
   - **Pending**: New requests awaiting approval
   - **Processing**: Approved, awaiting actual payout
   - **Completed**: Paid out successfully
   - **Failed**: Rejected or failed payouts

4. Click on any withdrawal to view details and take action:
   - **If Pending**: Approve ✓ or Reject ✗
   - **If Processing**: Mark as Completed ✓

## Features

### Admin Dashboard View

```
┌─────────────────────────────────────────────────┐
│          💰 Withdrawal Management               │
├─────────────────────────────────────────────────┤
│  Summary Cards:                                  │
│  [5 Pending] [₹25,000]  [3 Processing] [₹15,000]│
│  [12 Completed]         [2 Failed]              │
├─────────────────────────────────────────────────┤
│  Tabs: [Pending] [Processing] [Completed] [Failed]│
├─────────────────────────────────────────────────┤
│  Withdrawal List:                                │
│  • Professional Name    Amount  Status  Date     │
│  • Professional Name    Amount  Status  Date     │
│  • Professional Name    Amount  Status  Date     │
└─────────────────────────────────────────────────┘
```

### Withdrawal Detail Modal

```
┌──────────────────────────────────┐
│ Withdrawal Details               │
├──────────────────────────────────┤
│ Name: John Doe                   │
│ Email: john@example.com          │
│ Phone: +91-98765-43210          │
├──────────────────────────────────┤
│ Amount: ₹5,000                   │
│ Method: Bank Transfer            │
│ Status: Pending                  │
│ Date: 12/05/2026                │
├──────────────────────────────────┤
│ Notes: (optional)                │
│ [________]                       │
│ Rejection Reason: (if rejecting) │
│ [________]                       │
├──────────────────────────────────┤
│ [✓ Approve] [✗ Reject]          │
└──────────────────────────────────┘
```

## API Endpoints (Backend)

### Get Withdrawal Requests

```
GET /api/admin-wallet/withdrawals/pending?status=pending&page=1&limit=20
Headers: Authorization: Bearer {adminToken}
Response: { success: true, data: [...], pagination: {...} }
```

### Get Summary Stats

```
GET /api/admin-wallet/withdrawals/summary
Headers: Authorization: Bearer {adminToken}
Response: {
  success: true,
  data: {
    pending: { count: 5, amount: 25000 },
    processing: { count: 3, amount: 15000 },
    completed: 12,
    failed: 2
  }
}
```

### Approve Withdrawal

```
POST /api/admin-wallet/withdrawals/{withdrawalId}/approve
Headers: Authorization: Bearer {adminToken}
Body: { notes: "optional notes" }
Response: { success: true, message: "Withdrawal approved", data: {...} }
```

### Reject Withdrawal

```
POST /api/admin-wallet/withdrawals/{withdrawalId}/reject
Headers: Authorization: Bearer {adminToken}
Body: { reason: "reason for rejection" }
Response: { success: true, message: "Withdrawal rejected and amount refunded", data: {...} }
```

### Complete Withdrawal

```
POST /api/admin-wallet/withdrawals/{withdrawalId}/complete
Headers: Authorization: Bearer {adminToken}
Body: { transactionReference: "optional bank transaction ID" }
Response: { success: true, message: "Withdrawal marked as completed", data: {...} }
```

## Status Codes & Messages

### Success

- ✅ **200 OK**: Action completed successfully
- ✅ Message: "Withdrawal approved successfully"
- ✅ Message: "Withdrawal rejected and amount refunded"
- ✅ Message: "Withdrawal marked as completed"

### Errors

- ❌ **400 Bad Request**:
  - "Cannot approve withdrawal with status: {status}"
  - "Rejection reason is required"
  - "Withdrawal must be in 'processing' status to complete"
- ❌ **404 Not Found**: "Withdrawal request not found"
- ❌ **500 Server Error**: "Error {approving/rejecting/completing} withdrawal"

## Status Colors

| Status         | Color            | Meaning                      |
| -------------- | ---------------- | ---------------------------- |
| **Pending**    | Orange (#FFA500) | Awaiting admin review        |
| **Processing** | Green (#4CAF50)  | Approved, payout in progress |
| **Completed**  | Blue (#2196F3)   | Successfully paid out        |
| **Failed**     | Red (#f44336)    | Rejected or failed payout    |

## File Structure

```
Backend:
├── Server/controllers/adminWalletController.js (New functions: 5)
├── Server/routes/admin-wallet.js (New routes: 5)
└── Server/controllers/walletController.js (Modified: status to pending)

Frontend:
├── Client/src/pages/AdminWithdrawalManagement.js (NEW)
├── Client/src/pages/AdminWithdrawalManagement.css (NEW)
├── Client/src/App.js (Added route: /admin/withdrawals)
└── Client/src/pages/AdminDashboard.js (Added sidebar navigation)
```

## Testing Workflow

1. **Professional Request**
   - Login as professional
   - Go to Wallet Management
   - Request withdrawal for ₹5,000 via Bank Transfer
   - See status: "pending"

2. **Admin Review**
   - Login as admin
   - Click "Withdrawals" in sidebar
   - See the ₹5,000 request in "Pending" tab
   - Click to view details

3. **Admin Action**
   - Option A: Approve → status becomes "processing"
   - Option B: Reject with reason → amount refunded

4. **Complete Payout**
   - When bank transfer done, click withdrawal again
   - Mark as Completed with bank transaction ID
   - Status becomes "completed"

5. **Verification**
   - Professional sees all status updates in wallet history
   - Admin dashboard summary updates automatically

## Permissions Required

- Professional: Can request withdrawals
- Admin: Can view, approve, reject, and complete withdrawals
- System: Automatically refunds rejected withdrawals

## Important Notes

- ⚠️ Once rejected, amount is refunded to professional's wallet immediately
- ⚠️ Cannot complete withdrawal that's not in "processing" status
- ⚠️ Withdrawal amount is deducted from professional's balance when requested
- ⚠️ Admin rejection refunds the amount back to balance
- ℹ️ Transaction reference is optional but recommended for traceability
- ℹ️ Notes are private (admin only) and don't show to professional
