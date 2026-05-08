# Wallet & Payment System - Quick Reference

## 📊 System Overview

| Component               | Purpose              | Key Features                             |
| ----------------------- | -------------------- | ---------------------------------------- |
| **Professional Wallet** | Track earnings       | Daily/Weekly/Monthly/Yearly breakdown    |
| **Bank Details**        | Withdrawal setup     | Account verification, UPI support        |
| **Payments**            | Process transactions | Razorpay + Cash support                  |
| **Refunds**             | Handle cancellations | User request → Admin approval → Refund   |
| **Admin Wallet**        | Commission tracking  | Real-time analytics, transaction reports |

---

## 🔑 Key Environment Variables

```env
RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
RAZORPAY_WEBHOOK_URL=https://www.klpro.company/webhooks/razorpay
COMMISSION_PERCENTAGE=10
WITHDRAWAL_MINIMUM_AMOUNT=100
```

---

## 💰 Commission Flow

```
Payment Amount: ₹1000
├─ Commission (10%): ₹100 → Admin Wallet
└─ Professional Amount (90%): ₹900 → Professional Wallet
```

---

## 📱 Professional Wallet APIs

### 1. Get Wallet Details

```javascript
GET /api/wallet/details
Headers: { Authorization: "Bearer {token}" }

Response: {
  wallet: { totalEarnings, currentBalance, totalWithdrawn, earningsBreakdown },
  bankDetails: { ...bankInfo },
  recentTransactions: [ ... ]
}
```

### 2. Get Earnings Report

```javascript
GET /api/wallet/earnings-report?period=monthly
// period: 'daily' | 'weekly' | 'monthly' | 'yearly'

Response: {
  totalEarnings,
  totalCommission,
  netEarnings,
  transactionCount
}
```

### 3. Add Bank Details

```javascript
POST / api / wallet / bank - details;
Body: {
  (accountHolderName, accountNumber, ifscCode, bankName, upiId);
}
```

### 4. Request Withdrawal

```javascript
POST /api/wallet/initiate-withdrawal
Body: {
  amount: 5000,
  withdrawalMethod: 'bank_transfer',
  bankDetailsId: '...'
}
```

### 5. Get Transaction History

```javascript
GET /api/wallet/transaction-history?type=earning_booking&limit=50
```

---

## 💳 Payment Processing APIs

### Razorpay Payment

**Step 1:** Create Order

```javascript
POST /api/payment/create-order-booking
Body: { bookingId, paymentMethod: 'razorpay' }
Response: { paymentId, razorpayOrderId, amount, keyId }
```

**Step 2:** Frontend - Use Razorpay SDK

```javascript
const options = {
  key: response.keyId,
  amount: response.amount * 100, // in paise
  order_id: response.razorpayOrderId,
  handler: (paymentResponse) => {
    // Verify on backend
  },
};
```

**Step 3:** Verify Payment

```javascript
POST / api / payment / verify;
Body: {
  (razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId);
}
```

### Cash Payment

**Step 1:** Create Cash Payment

```javascript
POST / api / payment / create - cash - payment;
Body: {
  (bookingId, amount);
}
```

**Step 2:** Admin Confirms

```javascript
POST / api / payment / confirm - cash;
Body: {
  paymentId;
}
```

---

## 🔄 Refund APIs

### User Requests Refund

```javascript
POST /api/refund/request
Body: {
  paymentId,
  reason: 'booking_cancelled' | 'user_request' | ...,
  description: 'Reason text'
}
```

### View My Refunds

```javascript
GET /api/refund/my-refunds?status=completed
Response: {
  total,
  refunds: [
    { id, amount, reason, status, createdAt, completedAt }
  ]
}
```

### Admin Actions

```javascript
// Approve
POST /api/refund/approve
Body: { refundId, refundMethod: 'original_payment_method', approvalNotes }

// Reject
POST /api/refund/reject
Body: { refundId, rejectionReason }
```

---

## 🛡️ Admin Dashboard APIs

### Commission Report

```javascript
GET /api/admin-wallet/commission-report?period=monthly
Response: {
  commissions: { total, count, average },
  cashPayments: { total, count, average },
  grandTotal
}
```

### Professional Earnings

```javascript
GET /api/admin-wallet/professional-earnings?limit=50
Response: {
  total,
  professionals: [
    { professionalId, userId, totalEarnings, currentBalance }
  ]
}
```

### Manual Credit

```javascript
POST / api / admin - wallet / credit - wallet;
Body: {
  (professionalId, amount, reason, description);
}
```

### Manual Debit

```javascript
POST / api / admin - wallet / debit - wallet;
Body: {
  (professionalId, amount, reason, description);
}
```

### Suspend Wallet

```javascript
POST / api / admin - wallet / suspend - wallet;
Body: {
  (professionalId, reason);
}
```

### Payment Analytics

```javascript
GET /api/admin-wallet/payment-analytics
Response: {
  overview: { currentMonthTotal, lastMonthTotal, monthlyGrowth },
  paymentMethods: [ ... ],
  topProfessionals: [ ... ]
}
```

---

## 📊 Database Models Quick Reference

| Model                  | Purpose             | Key Fields                                       |
| ---------------------- | ------------------- | ------------------------------------------------ |
| **ProfessionalWallet** | Earnings tracking   | totalEarnings, currentBalance, earningsBreakdown |
| **BankDetails**        | Bank account info   | accountNumber, ifscCode, verificationStatus      |
| **Transaction**        | Audit trail         | type, amount, status, referenceId                |
| **Payment**            | Payment records     | razorpayOrderId, amount, status                  |
| **Refund**             | Refund management   | paymentId, amount, status, visibleToUser         |
| **AdminWallet**        | Commission tracking | totalBalance, totalCommissionReceived            |

---

## ⚙️ Configuration

### Minimum Withdrawal: ₹100

```env
WITHDRAWAL_MINIMUM_AMOUNT=100
```

### Commission Percentage: 10%

```env
COMMISSION_PERCENTAGE=10
```

### Razorpay Credentials

```env
RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
```

---

## 🔐 Security Notes

✅ All endpoints require authentication token  
✅ Role-based access control for admin endpoints  
✅ Signature verification for Razorpay payments  
✅ Commission calculation auditable via transaction logs  
✅ Refund visibility controlled per user

---

## 📝 Common Workflows

### Workflow 1: Book Service & Pay with Razorpay

1. User books service → Booking created
2. Frontend calls `POST /api/payment/create-order-booking`
3. Get `razorpayOrderId` and `keyId`
4. Use Razorpay SDK to open payment form
5. User completes payment
6. Frontend calls `POST /api/payment/verify`
7. System credits professional wallet (minus commission)

### Workflow 2: Request Refund

1. User clicks "Request Refund"
2. Frontend calls `POST /api/refund/request`
3. Refund created with status: pending
4. Admin reviews in dashboard
5. Admin calls `POST /api/refund/approve`
6. System processes refund via Razorpay
7. Amount returned to user's payment method
8. Professional's balance adjusted

### Workflow 3: Professional Withdraws Earnings

1. Professional adds bank details → `POST /api/wallet/bank-details`
2. Admin verifies bank account
3. Professional calls `POST /api/wallet/initiate-withdrawal`
4. System deducts from wallet (status: processing)
5. Admin confirms bank transfer
6. Amount transferred to professional's account
7. Transaction marked completed

### Workflow 4: Cash Payment

1. Professional completes service
2. User selects cash payment option
3. Frontend calls `POST /api/payment/create-cash-payment`
4. Payment created with status: pending
5. Admin confirms collection → `POST /api/payment/confirm-cash`
6. System processes:
   - Commission → Admin wallet
   - Net amount → Professional wallet

---

## 🚀 Frontend Implementation Checklist

### Professional Dashboard

- [ ] Display wallet balance
- [ ] Show earnings breakdown (daily/weekly/monthly/yearly)
- [ ] Display recent transactions
- [ ] Add/update bank details form
- [ ] Request withdrawal button
- [ ] View withdrawal history
- [ ] View refund requests

### Payment Integration

- [ ] Razorpay SDK integration
- [ ] Cash payment option
- [ ] Payment status display
- [ ] Order confirmation page
- [ ] Error handling

### Refund Management

- [ ] Display refund requests
- [ ] Show refund status
- [ ] Request refund form
- [ ] Refund tracking page
- [ ] Email notifications

### Admin Dashboard

- [ ] Commission report widget
- [ ] Professional earnings list
- [ ] Manual wallet adjustment form
- [ ] Refund approval interface
- [ ] Wallet suspension controls
- [ ] Payment analytics charts

---

## 🧪 Testing Endpoints (with cURL)

### Test Wallet Details

```bash
curl -X GET http://localhost:5000/api/wallet/details \
  -H "Authorization: Bearer {token}"
```

### Test Create Order

```bash
curl -X POST http://localhost:5000/api/payment/create-order-booking \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_id",
    "paymentMethod": "razorpay"
  }'
```

### Test Request Refund

```bash
curl -X POST http://localhost:5000/api/refund/request \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment_id",
    "reason": "booking_cancelled",
    "description": "Customer requested"
  }'
```

---

## 📞 Support

**Issues with Razorpay?**

- Check credentials in .env
- Verify webhook URL is accessible
- Test with Razorpay sandbox first

**Wallet not created?**

- Ensure Professional record exists
- Check user is linked to professional
- Wallet auto-creates on first transaction

**Refund stuck?**

- Check admin approval status
- Verify bank details verification
- Review transaction logs

---

## 📦 Packages Required

```json
{
  "razorpay": "^2.9.2",
  "mongoose": "^7.0.0",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.0"
}
```

All packages already in `package.json` (razorpay added)
