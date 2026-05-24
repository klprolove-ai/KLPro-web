# Admin Wallet Deduction Guide

## Overview

Administrators can deduct money from a professional's wallet for various reasons such as penalties, refunds, chargebacks, or adjustments. This guide explains the step-by-step process.

---

## Method 1: Using Admin API Endpoint

### Endpoint Details

**URL:** `POST /admin/wallet/debit-professional`

**Authentication:** Admin token required (Bearer token in Authorization header)

**Request Body:**

```json
{
  "professionalId": "PROFESSIONAL_OBJECT_ID",
  "amount": 500,
  "reason": "REQUIRED_REASON",
  "description": "OPTIONAL_DETAILED_DESCRIPTION"
}
```

### Required Fields

| Field            | Type                | Description                                                           |
| ---------------- | ------------------- | --------------------------------------------------------------------- |
| `professionalId` | String (MongoDB ID) | The unique ID of the professional                                     |
| `amount`         | Number              | Amount to deduct (in INR)                                             |
| `reason`         | String              | Reason for deduction (e.g., "Penalty", "Chargeback", "Service Issue") |
| `description`    | String              | Optional detailed explanation                                         |

### Example Request

```bash
curl -X POST http://localhost:5000/admin/wallet/debit-professional \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professionalId": "507f1f77bcf86cd799439011",
    "amount": 1000,
    "reason": "Chargeback due to customer dispute",
    "description": "Customer reported unauthorized transaction for booking #XYZ"
  }'
```

### Expected Response (Success)

```json
{
  "success": true,
  "message": "Debit completed successfully",
  "data": {
    "professionalId": "507f1f77bcf86cd799439011",
    "amount": 1000,
    "newBalance": 4500,
    "transactionId": "507f1f77bcf86cd799439012"
  }
}
```

### Error Responses

**Insufficient Balance:**

```json
{
  "message": "Insufficient balance",
  "currentBalance": 800,
  "requestedAmount": 1000
}
```

**Professional Not Found:**

```json
{
  "message": "Wallet not found"
}
```

**Missing Fields:**

```json
{
  "message": "Missing required fields"
}
```

---

## Method 2: Using Admin Dashboard (Frontend)

### Steps to Deduct Money via UI

1. **Login as Admin**
   - Go to admin dashboard at `/admin/dashboard`
   - Ensure you're logged in with admin credentials

2. **Navigate to Professional Management**
   - Click on "Professional Management" or "Professionals" section
   - Search for the professional by name, ID, or email

3. **Select Professional**
   - Click on the professional's profile/record
   - Look for "Wallet" or "Financial" tab

4. **Find Wallet Section**
   - Click on "Wallet Management" or similar section
   - You should see the professional's current balance

5. **Deduct Money**
   - Click "Deduct Amount" or "Debit Wallet" button
   - Fill in the form:
     - **Amount:** Enter the amount to deduct
     - **Reason:** Select or type the reason (e.g., "Penalty", "Chargeback")
     - **Description:** Provide detailed explanation (optional)
   - Click "Confirm" or "Submit"

6. **Verification**
   - System will show a confirmation dialog
   - Review the details
   - Click "Confirm" to proceed
   - You'll see a success message with the new balance

---

## Reasons for Deduction

Common reasons for deducting money from professional wallets:

| Reason         | Description                            | Example                                        |
| -------------- | -------------------------------------- | ---------------------------------------------- |
| **Penalty**    | Service quality issues or violations   | Poor service rating, late arrival              |
| **Chargeback** | Customer dispute or payment reversal   | Unauthorized transaction, service not rendered |
| **Refund**     | Refunding customer due to cancellation | Customer cancelled within refund window        |
| **Adjustment** | General accounting adjustment          | Duplicate payment, billing error               |
| **Late Fee**   | Non-compliance or missed deadline      | Missed document submission                     |
| **Damage Fee** | Professional caused damage             | Customer property damage                       |

---

## Important Notes

### Wallet Balance Requirements

- The professional's wallet balance must be sufficient to deduct the requested amount
- If balance is insufficient, the transaction will be rejected
- Admin must arrange payment through other means if wallet has insufficient funds

### Transaction Records

- Every deduction creates a transaction record in the `Transaction` collection
- Includes: timestamp, admin ID, reason, description, balance before/after
- All transactions are auditable and permanent

### Notifications

- Professional **will NOT** be automatically notified of deductions
- Consider sending a separate notification explaining the deduction
- Professional can view transaction history in their wallet dashboard

### Reversal

- To reverse a deduction, use the **Credit** function with the same amount
- Provide a reason like "Reversal of previous deduction"
- Both transactions will be logged

---

## Database Schema

### Transaction Record Created

```javascript
{
  walletId: ObjectId,                    // Professional's wallet ID
  professionalId: ObjectId,              // Professional's ID
  userId: ObjectId,                      // User ID of the professional
  type: "manual_debit",                 // Transaction type
  amount: Number,                        // Amount deducted
  status: "completed",                   // Always "completed" if successful
  description: String,                   // Reason + details
  referenceType: "manual",               // Always "manual" for admin deduction
  adminId: ObjectId,                     // Admin who performed deduction
  adminNotes: String,                    // Admin reason
  balanceBefore: Number,                 // Balance before deduction
  balanceAfter: Number,                  // Balance after deduction
  completedAt: Date,                     // Timestamp
  createdAt: Date,                       // Created timestamp
  updatedAt: Date                        // Last updated timestamp
}
```

---

## Audit Trail

All deductions are logged and can be audited:

1. **View Transaction History**
   - Admin can view all professional wallet transactions
   - Filter by date range, reason, or amount
   - Endpoint: `GET /admin/wallet/professional-transactions/:professionalId`

2. **View Admin Actions**
   - System logs which admin performed each deduction
   - Available for compliance and audit purposes

3. **Export Records**
   - Generate reports of all wallet deductions
   - Useful for financial reconciliation

---

## Related Functions

### Credit Professional Wallet

To add money to a professional's wallet:

```bash
curl -X POST http://localhost:5000/admin/wallet/credit-professional \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professionalId": "507f1f77bcf86cd799439011",
    "amount": 500,
    "reason": "Bonus for excellent service"
  }'
```

### View Professional Earnings

To see professional's earnings summary:

```bash
curl -X GET http://localhost:5000/admin/wallet/professional-earnings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Best Practices

1. **Document Everything**
   - Always provide a clear reason and description
   - Include reference to booking/complaint if applicable

2. **Verify Before Deduction**
   - Confirm the professional's identity
   - Verify the amount and reason
   - Check wallet balance

3. **Notify Professional**
   - Send a message explaining the deduction
   - Provide invoice/receipt reference
   - Allow for dispute resolution period

4. **Keep Records**
   - Maintain documentation of why deduction was made
   - Keep copies of customer complaints or issues
   - Archive for audit purposes

5. **Regular Reconciliation**
   - Periodically verify wallet balances
   - Reconcile with payment records
   - Check for discrepancies

---

## Troubleshooting

### "Insufficient Balance" Error

- Professional's wallet doesn't have enough funds
- Option 1: Deduct a smaller amount
- Option 2: Use credit system instead and invoice professional separately
- Option 3: Wait for professional to earn more (complete more bookings)

### "Professional Not Found" Error

- Verify the professional ID is correct
- Check if professional account has been deleted
- Ensure professional has a wallet created

### Transaction Not Appearing

- Refresh the page/dashboard
- Check transaction history/logs
- Verify admin permissions

---

## Support

For issues or questions about wallet deductions:

- Contact technical support team
- Check admin logs for transaction details
- Review audit trail for compliance
