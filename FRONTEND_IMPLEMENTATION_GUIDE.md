# Frontend Implementation Guide - Wallet & Payment System

## Overview

This guide helps frontend developers implement the wallet and payment system UI components.

---

## 1. Professional Dashboard Components

### A. Wallet Overview Card

**Location:** `Client/src/components/ProfessionalDashboard/WalletOverview.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const WalletOverview = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    try {
      const response = await axios.get("/api/wallet/details", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setWallet(response.data.data.wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="wallet-overview-card">
      <h3>Wallet Balance</h3>

      <div className="balance-display">
        <div className="amount">₹{wallet.currentBalance.toLocaleString()}</div>
        <p className="label">Current Balance</p>
      </div>

      <div className="earnings-grid">
        <div className="stat">
          <div className="value">₹{wallet.earningsBreakdown.today}</div>
          <div className="label">Today</div>
        </div>
        <div className="stat">
          <div className="value">₹{wallet.earningsBreakdown.thisWeek}</div>
          <div className="label">This Week</div>
        </div>
        <div className="stat">
          <div className="value">₹{wallet.earningsBreakdown.thisMonth}</div>
          <div className="label">This Month</div>
        </div>
        <div className="stat">
          <div className="value">₹{wallet.earningsBreakdown.thisYear}</div>
          <div className="label">This Year</div>
        </div>
      </div>

      <div className="stats-footer">
        <p>Total Earnings: ₹{wallet.totalEarnings.toLocaleString()}</p>
        <p>Total Withdrawn: ₹{wallet.totalWithdrawn.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default WalletOverview;
```

### B. Bank Details Form

**Location:** `Client/src/components/ProfessionalDashboard/BankDetailsForm.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const BankDetailsForm = () => {
  const [formData, setFormData] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    upiId: "",
  });

  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await axios.get("/api/wallet/bank-details", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.data) {
        setBankDetails(response.data.data);
        setFormData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("/api/wallet/bank-details", formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessage("Bank details saved successfully");
      fetchBankDetails();
    } catch (error) {
      setMessage("Error saving bank details: " + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bank-details-form">
      <h3>Bank Details for Withdrawal</h3>

      {bankDetails?.verificationStatus === "verified" && (
        <div className="verified-badge">✓ Verified</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Account Holder Name</label>
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Account Number</label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>IFSC Code</label>
          <input
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            placeholder="e.g., SBIN0001234"
            required
          />
        </div>

        <div className="form-group">
          <label>Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Branch Name</label>
          <input
            type="text"
            name="branchName"
            value={formData.branchName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>UPI ID (Optional)</label>
          <input
            type="email"
            name="upiId"
            value={formData.upiId}
            onChange={handleChange}
            placeholder="username@upi"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Bank Details"}
        </button>

        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
};

export default BankDetailsForm;
```

### C. Withdrawal Request Form

**Location:** `Client/src/components/ProfessionalDashboard/WithdrawalForm.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const WithdrawalForm = ({ walletBalance, bankDetails }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const minAmount = 100;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (amount < minAmount) {
      setMessage(`Minimum withdrawal amount is ₹${minAmount}`);
      return;
    }

    if (amount > walletBalance) {
      setMessage("Insufficient balance");
      return;
    }

    if (!bankDetails?.id) {
      setMessage("Please add and verify bank details first");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "/api/wallet/initiate-withdrawal",
        {
          amount: parseFloat(amount),
          withdrawalMethod: method,
          bankDetailsId: bankDetails.id,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      setMessage(
        `Withdrawal request submitted! Processing in ${response.data.data.estimatedTime}`,
      );
      setAmount("");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Error initiating withdrawal",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdrawal-form">
      <h3>Request Withdrawal</h3>

      <div className="available-balance">
        Available Balance: ₹{walletBalance.toLocaleString()}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Amount (Min: ₹{minAmount})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min={minAmount}
            max={walletBalance}
            required
          />
        </div>

        <div className="form-group">
          <label>Withdrawal Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="net_banking">Net Banking</option>
          </select>
        </div>

        <button type="submit" disabled={loading || !amount}>
          {loading ? "Processing..." : "Request Withdrawal"}
        </button>

        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
};

export default WithdrawalForm;
```

---

## 2. Payment Integration

### A. Booking Payment Component

**Location:** `Client/src/components/Booking/BookingPayment.js`

```javascript
import React, { useState } from "react";
import axios from "axios";

const BookingPayment = ({ bookingId, amount }) => {
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (paymentMethod === "razorpay") {
      await initiateRazorpayPayment();
    } else {
      await initiateCashPayment();
    }
  };

  const initiateRazorpayPayment = async () => {
    setLoading(true);
    try {
      // Create order
      const response = await axios.post(
        "/api/payment/create-order-booking",
        {
          bookingId,
          paymentMethod: "razorpay",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const { razorpayOrderId, keyId, paymentId } = response.data.data;

      // Open Razorpay checkout
      const options = {
        key: keyId,
        order_id: razorpayOrderId,
        amount: amount * 100, // in paise
        currency: "INR",
        name: "KLPro",
        description: `Payment for Booking #${bookingId}`,
        handler: async (paymentResponse) => {
          await verifyPayment(
            paymentResponse.razorpay_order_id,
            paymentResponse.razorpay_payment_id,
            paymentResponse.razorpay_signature,
            paymentId,
          );
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert(error.response?.data?.message || "Error initiating payment");
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (orderId, paymentId, signature, paymentDbId) => {
    try {
      const response = await axios.post(
        "/api/payment/verify",
        {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          paymentId: paymentDbId,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      if (response.data.success) {
        alert("Payment successful!");
        // Redirect to booking confirmation
        window.location.href = "/booking-confirmation";
      }
    } catch (error) {
      console.error("Payment verification failed:", error);
      alert("Payment verification failed");
    }
  };

  const initiateCashPayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "/api/payment/create-cash-payment",
        {
          bookingId,
          amount,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      alert(
        "Cash payment recorded. Professional will collect payment on service date.",
      );
      window.location.href = "/booking-confirmation";
    } catch (error) {
      alert(error.response?.data?.message || "Error creating cash payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-payment">
      <h3>Payment Method</h3>

      <div className="payment-options">
        <label className="radio-group">
          <input
            type="radio"
            value="razorpay"
            checked={paymentMethod === "razorpay"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <span>Pay with Razorpay (UPI, Card, Net Banking)</span>
        </label>

        <label className="radio-group">
          <input
            type="radio"
            value="cash"
            checked={paymentMethod === "cash"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <span>Cash on Service Date</span>
        </label>
      </div>

      <div className="payment-summary">
        <div className="row">
          <span>Amount:</span>
          <span>₹{amount}</span>
        </div>
      </div>

      <button className="btn-pay" onClick={handlePayment} disabled={loading}>
        {loading ? "Processing..." : "Proceed to Payment"}
      </button>
    </div>
  );
};

export default BookingPayment;
```

---

## 3. Refund Management

### A. Refund Request Component

**Location:** `Client/src/components/Bookings/RefundRequest.js`

```javascript
import React, { useState } from "react";
import axios from "axios";

const RefundRequest = ({ paymentId, bookingAmount }) => {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        "/api/refund/request",
        {
          paymentId,
          reason,
          description,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      alert(
        "Refund request submitted! Status can be tracked in your refund history.",
      );
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.message || "Error submitting refund request");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} className="btn-refund">
        Request Refund
      </button>
    );
  }

  return (
    <div className="refund-form">
      <h4>Request Refund</h4>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Refund Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          >
            <option value="">Select reason</option>
            <option value="user_request">User Request</option>
            <option value="booking_cancelled">Booking Cancelled</option>
            <option value="professional_rejected">Professional Rejected</option>
            <option value="service_not_completed">Service Not Completed</option>
            <option value="customer_complaint">Customer Complaint</option>
          </select>
        </div>

        <div className="form-group">
          <label>Additional Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain why you want a refund"
            required
          />
        </div>

        <div className="refund-amount">Refund Amount: ₹{bookingAmount}</div>

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn-cancel"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RefundRequest;
```

### B. Refund History Component

**Location:** `Client/src/components/Bookings/RefundHistory.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const RefundHistory = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const response = await axios.get("/api/refund/my-refunds", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setRefunds(response.data.data.refunds);
    } catch (error) {
      console.error("Error fetching refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-warning",
      processing: "badge-info",
      completed: "badge-success",
      rejected: "badge-danger",
      failed: "badge-danger",
    };
    return badges[status] || "badge-secondary";
  };

  if (loading) return <div>Loading refunds...</div>;

  return (
    <div className="refund-history">
      <h3>Refund History</h3>

      {refunds.length === 0 ? (
        <p>No refunds yet</p>
      ) : (
        <table className="refund-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id}>
                <td>{new Date(refund.createdAt).toLocaleDateString()}</td>
                <td>₹{refund.amount}</td>
                <td>{refund.reason}</td>
                <td>
                  <span className={`badge ${getStatusBadge(refund.status)}`}>
                    {refund.status}
                  </span>
                </td>
                <td>
                  <a href={`/refund/${refund.id}`}>Details</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RefundHistory;
```

---

## 4. Admin Dashboard Components

### A. Commission Report Widget

**Location:** `Client/src/components/Admin/CommissionReport.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const CommissionReport = () => {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(
        `/api/admin-wallet/commission-report?period=${period}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setReport(response.data.data);
    } catch (error) {
      console.error("Error fetching report:", error);
    }
  };

  if (!report) return <div>Loading...</div>;

  return (
    <div className="commission-report-widget">
      <h3>Commission Report</h3>

      <div className="period-selector">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Commission Received</div>
          <div className="amount">
            ₹{report.commissions.total.toLocaleString()}
          </div>
          <div className="count">{report.commissions.count} transactions</div>
        </div>

        <div className="stat-card">
          <div className="label">Cash Collected</div>
          <div className="amount">
            ₹{report.cashPayments.total.toLocaleString()}
          </div>
          <div className="count">{report.cashPayments.count} payments</div>
        </div>

        <div className="stat-card highlight">
          <div className="label">Total Revenue</div>
          <div className="amount">₹{report.grandTotal.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export default CommissionReport;
```

### B. Professional Earnings Table

**Location:** `Client/src/components/Admin/ProfessionalEarnings.js`

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const ProfessionalEarnings = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const response = await axios.get(
        "/api/admin-wallet/professional-earnings",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setProfessionals(response.data.data.professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="professional-earnings">
      <h3>Professional Earnings</h3>

      <table className="earnings-table">
        <thead>
          <tr>
            <th>Professional</th>
            <th>Category</th>
            <th>Total Earnings</th>
            <th>Current Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {professionals.map((prof) => (
            <tr key={prof.professionalId}>
              <td>{prof.userId?.name}</td>
              <td>{prof.professionalId?.category}</td>
              <td>₹{prof.totalEarnings.toLocaleString()}</td>
              <td>₹{prof.currentBalance.toLocaleString()}</td>
              <td>
                <button className="btn-manage">Manage Wallet</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProfessionalEarnings;
```

---

## 5. Required CSS

**Location:** `Client/src/styles/wallet.css`

```css
/* Wallet Overview */
.wallet-overview-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.balance-display {
  text-align: center;
  margin: 20px 0;
}

.balance-display .amount {
  font-size: 2.5rem;
  font-weight: bold;
}

.earnings-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 20px 0;
}

.stat {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.stat .value {
  font-size: 1.5rem;
  font-weight: bold;
}

/* Bank Details Form */
.bank-details-form {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.verified-badge {
  background: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
}

/* Payment Options */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.radio-group {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.radio-group:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.radio-group input[type="radio"] {
  margin-right: 10px;
}

/* Status Badge */
.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-warning {
  background: #fff3cd;
  color: #856404;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

/* Responsive */
@media (max-width: 768px) {
  .earnings-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  table {
    font-size: 0.9rem;
  }

  button {
    padding: 10px 15px;
    font-size: 0.9rem;
  }
}
```

---

## 6. Setup Instructions

1. **Install Dependencies**

   ```bash
   cd Server
   npm install razorpay
   ```

2. **Update Environment Variables**

   ```env
   RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
   RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
   ```

3. **Add Razorpay Script to HTML**

   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

4. **Import Components**
   ```javascript
   import WalletOverview from "./components/ProfessionalDashboard/WalletOverview";
   import BankDetailsForm from "./components/ProfessionalDashboard/BankDetailsForm";
   import BookingPayment from "./components/Booking/BookingPayment";
   ```

---

## 7. API Integration Helper

**Location:** `Client/src/api/walletService.js`

```javascript
import axios from "axios";

const API_URL = "/api";
const getToken = () => localStorage.getItem("token");

export const walletService = {
  // Wallet Operations
  getWalletDetails: () =>
    axios.get(`${API_URL}/wallet/details`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  getEarningsReport: (period = "monthly") =>
    axios.get(`${API_URL}/wallet/earnings-report?period=${period}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  addBankDetails: (bankData) =>
    axios.post(`${API_URL}/wallet/bank-details`, bankData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  initiateWithdrawal: (withdrawalData) =>
    axios.post(`${API_URL}/wallet/initiate-withdrawal`, withdrawalData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  // Payment Operations
  createOrderBooking: (bookingData) =>
    axios.post(`${API_URL}/payment/create-order-booking`, bookingData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  verifyPayment: (paymentData) =>
    axios.post(`${API_URL}/payment/verify`, paymentData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  // Refund Operations
  requestRefund: (refundData) =>
    axios.post(`${API_URL}/refund/request`, refundData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  getMyRefunds: (status = "") =>
    axios.get(
      `${API_URL}/refund/my-refunds${status ? `?status=${status}` : ""}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      },
    ),
};
```

---

## Next Steps

1. ✅ Create components in Client/src/components/
2. ✅ Add CSS to Client/src/styles/
3. ✅ Import and use in pages
4. ✅ Test payment flow with Razorpay sandbox
5. ✅ Test refund requests and approvals
6. ✅ Test withdrawal workflow
