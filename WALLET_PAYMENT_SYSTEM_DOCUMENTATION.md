# Professional Wallet & Payment System Documentation

## Overview

The Professional Wallet & Payment System enables professionals to manage earnings, withdrawals, and receive payments through multiple payment methods (Cash, Razorpay). The system includes comprehensive admin controls for wallet management and commission tracking.

---

## System Components

### 1. **Professional Wallet System**

- Track daily, weekly, monthly, and yearly earnings
- View current balance and total withdrawals
- Commission deduction tracking
- Wallet status management

### 2. **Bank Details Management**

- Add and update bank account information
- UPI ID support
- Verification status tracking
- Multiple payment method support

### 3. **Payment Processing**

- **Razorpay Integration** - Live payment gateway
- **Cash Payments** - Manual collection with admin confirmation
- Payment status tracking
- Automatic commission calculation

### 4. **Withdrawal System**

- Bank transfer withdrawals
- UPI withdrawals
- Net banking options
- Withdrawal history tracking

### 5. **Refund Management**

- User-initiated refund requests
- Admin approval/rejection workflow
- Razorpay refund processing
- Refund visibility for users

### 6. **Admin Wallet Management**

- Commission tracking
- Professional earnings monitoring
- Manual wallet adjustments
- Wallet suspension/reactivation
- Transaction and payment analytics

---

## Database Models

### ProfessionalWallet

```javascript
{
  professionalId: ObjectId,
  userId: ObjectId,
  totalEarnings: Number,
  currentBalance: Number,
  totalWithdrawn: Number,
  totalCommissionPaid: Number,
  earningsBreakdown: {
    today: Number,
    thisWeek: Number,
    thisMonth: Number,
    thisYear: Number
  },
  status: 'active' | 'frozen' | 'suspended' | 'inactive'
}
```

### BankDetails

```javascript
{
  professionalId: ObjectId,
  userId: ObjectId,
  accountHolderName: String,
  accountNumber: String,
  ifscCode: String,
  bankName: String,
  upiId: String,
  verificationStatus: 'pending' | 'verified' | 'failed' | 'rejected',
  isActive: Boolean,
  isPrimary: Boolean
}
```

### Transaction

```javascript
{
  walletId: ObjectId,
  professionalId: ObjectId,
  type: 'earning_booking' | 'earning_product' | 'commission_deducted' | 'withdrawal_initiated' | 'refund' | 'manual_credit' | 'manual_debit',
  amount: Number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  referenceType: 'booking' | 'product_order' | 'refund' | 'withdrawal',
  referenceId: ObjectId,
  balanceBefore: Number,
  balanceAfter: Number
}
```

### Payment

```javascript
{
  razorpayOrderId: String,
  razorpayPaymentId: String,
  userId: ObjectId,
  amount: Number,
  paymentMethod: 'cash' | 'razorpay' | 'upi' | 'net_banking',
  referenceType: 'booking' | 'product_order' | 'wallet_topup',
  referenceId: ObjectId,
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded',
  commissionAmount: Number,
  professionalAmount: Number,
  adminAmount: Number
}
```

### Refund

```javascript
{
  paymentId: ObjectId,
  userId: ObjectId,
  amount: Number,
  reason: String,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected',
  visibleToUser: Boolean,
  refundMethod: 'original_payment_method' | 'wallet_credit'
}
```

### AdminWallet

```javascript
{
  adminId: ObjectId,
  totalBalance: Number,
  totalCommissionReceived: Number,
  totalCashCollected: Number,
  totalPayoutsMade: Number,
  commissionBreakdown: {
    today: Number,
    thisWeek: Number,
    thisMonth: Number,
    thisYear: Number
  }
}
```

---

## API Endpoints

### Professional Wallet Endpoints

#### Get Wallet Details

```
GET /api/wallet/details
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    wallet: {
      totalEarnings: 50000,
      currentBalance: 35000,
      totalWithdrawn: 15000,
      earningsBreakdown: {
        today: 1000,
        thisWeek: 5000,
        thisMonth: 20000,
        thisYear: 50000
      }
    },
    bankDetails: { ... },
    recentTransactions: [ ... ]
  }
}
```

#### Get Earnings Report

```
GET /api/wallet/earnings-report?period=monthly
Query Parameters:
- period: 'daily' | 'weekly' | 'monthly' | 'yearly'

Response:
{
  success: true,
  data: {
    period: 'monthly',
    totalEarnings: 20000,
    totalCommission: 2000,
    netEarnings: 18000,
    transactionCount: 15
  }
}
```

#### Add Bank Details

```
POST /api/wallet/bank-details
Headers: Authorization: Bearer {token}
Body: {
  accountHolderName: "John Doe",
  accountNumber: "1234567890",
  ifscCode: "SBIN0001234",
  bankName: "State Bank of India",
  upiId: "john@upi",
  bankAccountProofUrl: "https://..."
}

Response:
{
  success: true,
  message: 'Bank details saved successfully'
}
```

#### Get Bank Details

```
GET /api/wallet/bank-details
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    id: "...",
    accountHolderName: "John Doe",
    bankName: "State Bank of India",
    verificationStatus: 'pending'
  }
}
```

#### Initiate Withdrawal

```
POST /api/wallet/initiate-withdrawal
Headers: Authorization: Bearer {token}
Body: {
  amount: 5000,
  withdrawalMethod: "bank_transfer",
  bankDetailsId: "..."
}

Response:
{
  success: true,
  data: {
    transactionId: "...",
    amount: 5000,
    status: 'processing',
    estimatedTime: '2-3 business days'
  }
}
```

#### Get Transaction History

```
GET /api/wallet/transaction-history?type=earning_booking&status=completed&limit=50
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    total: 100,
    transactions: [ ... ]
  }
}
```

#### Get User Refunds

```
GET /api/wallet/my-refunds?status=completed
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    total: 5,
    refunds: [ ... ]
  }
}
```

---

### Payment Endpoints

#### Create Razorpay Order for Booking

```
POST /api/payment/create-order-booking
Headers: Authorization: Bearer {token}
Body: {
  bookingId: "...",
  paymentMethod: "razorpay"
}

Response:
{
  success: true,
  data: {
    paymentId: "...",
    razorpayOrderId: "order_xxx",
    amount: 5000,
    currency: "INR",
    keyId: "rzp_live_..."
  }
}
```

#### Create Cash Payment

```
POST /api/payment/create-cash-payment
Headers: Authorization: Bearer {token}
Body: {
  bookingId: "...",
  amount: 5000
}

Response:
{
  success: true,
  data: {
    paymentId: "..."
  }
}
```

#### Verify Razorpay Payment

```
POST /api/payment/verify
Headers: Authorization: Bearer {token}
Body: {
  razorpayOrderId: "order_xxx",
  razorpayPaymentId: "pay_xxx",
  razorpaySignature: "signature_xxx",
  paymentId: "..."
}

Response:
{
  success: true,
  message: 'Payment verified successfully'
}
```

#### Get Payment History

```
GET /api/payment/history?status=completed&limit=20
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    total: 50,
    payments: [ ... ]
  }
}
```

#### Confirm Cash Payment (Admin)

```
POST /api/payment/confirm-cash
Headers: Authorization: Bearer {token}
Body: {
  paymentId: "..."
}

Response:
{
  success: true,
  message: 'Cash payment confirmed successfully'
}
```

---

### Refund Endpoints

#### Request Refund

```
POST /api/refund/request
Headers: Authorization: Bearer {token}
Body: {
  paymentId: "...",
  reason: "booking_cancelled",
  description: "Customer requested cancellation"
}

Response:
{
  success: true,
  data: {
    refundId: "...",
    status: 'pending'
  }
}
```

#### Get My Refunds

```
GET /api/refund/my-refunds?status=completed
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    total: 5,
    refunds: [ ... ]
  }
}
```

#### Get Refund Details

```
GET /api/refund/:refundId
Headers: Authorization: Bearer {token}

Response:
{
  success: true,
  data: { ... }
}
```

#### Approve Refund (Admin)

```
POST /api/refund/approve
Headers: Authorization: Bearer {admin_token}
Body: {
  refundId: "...",
  refundMethod: "original_payment_method",
  approvalNotes: "Refund approved"
}

Response:
{
  success: true,
  message: 'Refund approved successfully'
}
```

#### Reject Refund (Admin)

```
POST /api/refund/reject
Headers: Authorization: Bearer {admin_token}
Body: {
  refundId: "...",
  rejectionReason: "Refund window expired"
}

Response:
{
  success: true,
  message: 'Refund rejected'
}
```

#### Get All Refunds (Admin)

```
GET /api/refund/?status=pending&limit=50
Headers: Authorization: Bearer {admin_token}

Response:
{
  success: true,
  data: {
    total: 20,
    refunds: [ ... ]
  }
}
```

---

### Admin Wallet Endpoints

#### Get Admin Wallet Details

```
GET /api/admin-wallet/details
Headers: Authorization: Bearer {admin_token}

Response:
{
  success: true,
  data: {
    totalBalance: 500000,
    totalCommissionReceived: 450000,
    totalCashCollected: 200000,
    commissionBreakdown: { ... },
    stats: { ... }
  }
}
```

#### Get Commission Report

```
GET /api/admin-wallet/commission-report?period=monthly
Headers: Authorization: Bearer {admin_token}

Response:
{
  success: true,
  data: {
    period: 'monthly',
    commissions: {
      total: 50000,
      count: 100
    },
    cashPayments: {
      total: 20000,
      count: 50
    },
    grandTotal: 70000
  }
}
```

#### Get Professional Earnings

```
GET /api/admin-wallet/professional-earnings?sortBy=-totalEarnings&limit=50
Headers: Authorization: Bearer {admin_token}

Response:
{
  success: true,
  data: {
    total: 250,
    professionals: [ ... ]
  }
}
```

#### Credit Professional Wallet (Admin)

```
POST /api/admin-wallet/credit-wallet
Headers: Authorization: Bearer {admin_token}
Body: {
  professionalId: "...",
  amount: 5000,
  reason: "Bonus payment",
  description: "Performance bonus for Q3"
}

Response:
{
  success: true,
  data: {
    newBalance: 40000,
    transactionId: "..."
  }
}
```

#### Debit Professional Wallet (Admin)

```
POST /api/admin-wallet/debit-wallet
Headers: Authorization: Bearer {admin_token}
Body: {
  professionalId: "...",
  amount: 1000,
  reason: "Penalty",
  description: "Late service cancellation"
}

Response:
{
  success: true,
  data: {
    newBalance: 34000
  }
}
```

#### Suspend Professional Wallet (Admin)

```
POST /api/admin-wallet/suspend-wallet
Headers: Authorization: Bearer {admin_token}
Body: {
  professionalId: "...",
  reason: "Suspicious activity detected"
}

Response:
{
  success: true,
  message: 'Professional wallet suspended'
}
```

#### Reactivate Professional Wallet (Admin)

```
POST /api/admin-wallet/reactivate-wallet
Headers: Authorization: Bearer {admin_token}
Body: {
  professionalId: "..."
}

Response:
{
  success: true,
  message: 'Professional wallet reactivated'
}
```

#### Get Payment Analytics (Admin)

```
GET /api/admin-wallet/payment-analytics
Headers: Authorization: Bearer {admin_token}

Response:
{
  success: true,
  data: {
    overview: {
      currentMonthTotal: 500000,
      lastMonthTotal: 450000,
      monthlyGrowth: "11.11"
    },
    paymentMethods: [ ... ],
    topProfessionals: [ ... ]
  }
}
```

---

## Commission Calculation

- **Commission Percentage**: 10% (configurable via `COMMISSION_PERCENTAGE` env variable)
- **Deduction Timing**: Automatic at time of payment verification
- **Professional Amount**: 90% of payment amount
- **Admin Amount**: 10% of payment amount

Example:

```
Total Amount: ₹1000
Commission (10%): ₹100
Professional Receives: ₹900
Admin Receives: ₹100
```

---

## Payment Flow

### Razorpay Payment Flow

1. **User initiates payment**

   ```
   POST /api/payment/create-order-booking
   ```

2. **Order created with Razorpay**
   - Order ID returned to frontend
   - Frontend redirects to Razorpay checkout

3. **User completes payment on Razorpay**

4. **Frontend verifies payment**

   ```
   POST /api/payment/verify
   ```

5. **System processes payment**
   - Payment status updated to "completed"
   - Commission calculated and credited to admin
   - Professional earning credited to wallet
   - Transactions created for audit

### Cash Payment Flow

1. **Professional completes service**

2. **User selects cash payment option**

   ```
   POST /api/payment/create-cash-payment
   ```

3. **Payment record created (pending)**

4. **Admin confirms cash collection**

   ```
   POST /api/payment/confirm-cash
   ```

5. **System processes cash payment**
   - Commission deducted automatically
   - Professional wallet credited with net amount

---

## Withdrawal Process

### Withdrawal Steps

1. **Professional adds bank details**

   ```
   POST /api/wallet/bank-details
   ```

2. **System verifies bank details**
   - Bank details verification pending

3. **Professional requests withdrawal**

   ```
   POST /api/wallet/initiate-withdrawal
   ```

4. **System validates**
   - Minimum balance check
   - Account verification status

5. **Admin processes withdrawal**
   - Transfer to professional's bank account
   - Transaction status updated

### Withdrawal Constraints

- Minimum withdrawal amount: ₹100 (configurable)
- Processing time: 2-3 business days
- Only verified bank accounts can receive withdrawals

---

## Refund Process

### User-Initiated Refund

1. **User requests refund**

   ```
   POST /api/refund/request
   ```

2. **Refund request created (pending)**
   - Visible to user
   - Status: pending

3. **Admin reviews and approves/rejects**

   ```
   POST /api/refund/approve  or  POST /api/refund/reject
   ```

4. **If approved, system processes refund**
   - Razorpay refund initiated (if Razorpay payment)
   - Professional's earning reversed
   - Commission reversed
   - User notified

5. **Refund completion**
   - Amount credited to user's original payment method
   - Refund status: completed

---

## Razorpay Integration

### Configuration

```env
RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
RAZORPAY_WEBHOOK_URL=https://www.klpro.company/webhooks/razorpay
```

### Webhook Events

Handled events:

- `refund.processed` - Refund successfully processed
- `refund.failed` - Refund processing failed

---

## Admin Features

### Dashboard Widgets

1. **Commission Summary**
   - Today's commission
   - Weekly commission
   - Monthly commission
   - Yearly commission

2. **Cash Collected**
   - Today's cash
   - Weekly cash
   - Monthly cash

3. **Professional Earnings**
   - Top earners
   - Active professionals
   - Pending withdrawals
   - Suspended wallets

4. **Payment Analytics**
   - Total payments processed
   - Payment method breakdown
   - Growth metrics
   - Failed payments

### Admin Functions

- View all professional wallets
- Manual credit/debit to professional wallets
- Suspend/reactivate professional wallets
- Approve/reject refunds
- Confirm cash payments
- Generate reports
- View payment analytics

---

## Error Handling

### Common Error Responses

```javascript
// Unauthorized
{
  success: false,
  message: 'No token, authorization denied'
}

// Insufficient balance
{
  success: false,
  message: 'Insufficient balance for withdrawal',
  availableBalance: 1000,
  requestedAmount: 5000
}

// Payment verification failed
{
  success: false,
  message: 'Payment verification failed - Invalid signature'
}

// Wallet not found
{
  success: false,
  message: 'Wallet not found'
}
```

---

## Testing with cURL

### Create Razorpay Order

```bash
curl -X POST http://localhost:5000/api/payment/create-order-booking \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_id_here",
    "paymentMethod": "razorpay"
  }'
```

### Verify Payment

```bash
curl -X POST http://localhost:5000/api/payment/verify \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_xxx",
    "paymentId": "payment_id_here"
  }'
```

### Get Wallet Details

```bash
curl -X GET http://localhost:5000/api/wallet/details \
  -H "Authorization: Bearer {token}"
```

### Request Refund

```bash
curl -X POST http://localhost:5000/api/refund/request \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment_id_here",
    "reason": "booking_cancelled",
    "description": "Customer requested cancellation"
  }'
```

---

## Environment Variables

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
RAZORPAY_WEBHOOK_URL=https://www.klpro.company/webhooks/razorpay

# Wallet
COMMISSION_PERCENTAGE=10
WITHDRAWAL_MINIMUM_AMOUNT=100
```

---

## Deployment Checklist

- [ ] Razorpay credentials configured in .env
- [ ] MongoDB indexes created for models
- [ ] Admin wallet initialized
- [ ] Webhook URL configured
- [ ] Email notifications setup (optional)
- [ ] Security: API rate limiting implemented
- [ ] Security: Input validation on all endpoints
- [ ] Security: CORS configured correctly
- [ ] Testing: Integration tests passed
- [ ] Testing: Payment flow validated with Razorpay sandbox
- [ ] Documentation: Deployed to documentation site
- [ ] Backup: Database backup strategy in place

---

## Support & Troubleshooting

### Issue: Payment verification fails

- Verify Razorpay credentials are correct
- Check webhook URL is accessible
- Ensure signature calculation matches Razorpay format

### Issue: Professional wallet not created

- Check Professional record exists
- Verify user is linked to professional account
- Wallet auto-creates on first balance update

### Issue: Refund processing stuck

- Check admin approval status
- Verify bank details are verified
- Check transaction logs for errors

---

## Future Enhancements

1. Wallet top-up via online payment
2. Auto-settlement (daily/weekly)
3. Tax calculation and GST support
4. Advanced reporting and analytics
5. Bulk refund processing
6. Wallet integration with app notifications
7. Multi-currency support
8. Wallet transfer between professionals
