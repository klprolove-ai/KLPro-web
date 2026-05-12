import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './ProfessionalWalletTopup.css';

const ProfessionalWalletTopup = () => {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/wallet/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        setCurrentBalance(response.data.data.wallet.currentBalance || 0);
        setRecentTransactions(response.data.data.transactions || []);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching wallet details:', err);
      setError('Failed to load wallet details');
      setCurrentBalance(0);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load Razorpay SDK if not already present
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window is not available'));
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(script);
    });
  };

  const handleTopup = async (e) => {
    e.preventDefault();

    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(topupAmount);
    if (amount < 100) {
      setError('Minimum top-up amount is ₹100');
      return;
    }

    if (amount > 1000000) {
      setError('Maximum top-up amount is ₹10,00,000');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const token = localStorage.getItem('token');

      // For online payments (Razorpay/UPI/Bank Transfer) use Razorpay checkout
      if (['razorpay', 'upi', 'bank_transfer'].includes(paymentMethod)) {
        // Create Razorpay order first
        const orderResponse = await axios.post(
          `${API_BASE_URL}/payment/create-topup-order`,
          { amount: amount },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!orderResponse.data.success) {
          throw new Error('Failed to create payment order');
        }

        const { orderId, key } = orderResponse.data.data;

        // Open Razorpay payment modal
        const options = {
          key,
          amount: amount * 100, // Amount in paise
          currency: 'INR',
          name: 'KL Pro Wallet',
          description: 'Add funds to wallet',
          order_id: orderId,
          handler: async (response) => {
            try {
              // Verify and complete the payment
              const verifyResponse = await axios.post(
                `${API_BASE_URL}/payment/verify-topup`,
                {
                  orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (verifyResponse.data.success) {
                setSuccessMessage(
                  `Successfully added ₹${amount} to your wallet!`
                );
                setTopupAmount('');
                
                // Refresh wallet details
                await fetchWalletDetails();
                
                setTimeout(() => setSuccessMessage(''), 4000);
              }
            } catch (err) {
              console.error('Payment verification error:', err);
              setError('Payment verification failed. Please contact support.');
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            email: localStorage.getItem('userEmail') || '',
            contact: localStorage.getItem('userPhone') || '',
          },
          theme: {
            color: '#2196f3',
          },
          modal: {
            ondismiss: () => {
              setProcessing(false);
            },
          },
        };

        // Ensure Razorpay SDK is loaded, then open modal
        await loadRazorpayScript();
        const RazorpayConstructor = window.Razorpay;
        if (!RazorpayConstructor) throw new Error('Razorpay SDK failed to load');
        const rzp = new RazorpayConstructor(options);
        rzp.open();
      } else {
        // For manual/bank transfer methods
        const response = await axios.post(
          `${API_BASE_URL}/wallet/add-funds`,
          {
            amount: amount,
            paymentMethod: paymentMethod,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          setSuccessMessage(
            `Funds requested: ₹${amount}. Please complete the transfer.`
          );
          setTopupAmount('');
          
          // Refresh wallet details
          await fetchWalletDetails();
          
          setTimeout(() => setSuccessMessage(''), 4000);
        }
      }
    } catch (err) {
      console.error('Error processing top-up:', err);
      setError(err.response?.data?.message || 'Failed to process top-up');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading wallet...</div>;
  }

  return (
    <div className="professional-wallet-topup-container">
      <div className="wallet-section">
        <div className="wallet-card">
          <div className="wallet-header">
            <h3>💰 Your Wallet</h3>
          </div>

          <div className="wallet-balance">
            <span className="balance-label">Current Balance</span>
            <span className="balance-amount">₹{currentBalance?.toFixed(2)}</span>
          </div>

          <p className="wallet-info-text">
            Add funds to your wallet to manage payments and receive commissions
          </p>
        </div>

        <div className="topup-form-card">
          <h3>📝 Add Funds</h3>
          
          {error && <div className="alert alert-error">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <form onSubmit={handleTopup}>
            <div className="form-group">
              <label htmlFor="topupAmount">Amount (₹) *</label>
              <div className="amount-input-group">
                <span className="currency-symbol">₹</span>
                <input
                  id="topupAmount"
                  type="number"
                  className="form-control amount-input"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="0.00"
                  step="1"
                  min="100"
                  max="1000000"
                  disabled={processing}
                />
              </div>
              <div className="amount-help">
                <small>Minimum: ₹100 | Maximum: ₹10,00,000</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="paymentMethod">Payment Method *</label>
              <select
                id="paymentMethod"
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={processing}
              >
                <option value="razorpay">💳 Credit/Debit Card (Razorpay)</option>
                <option value="upi">📱 UPI</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            {paymentMethod !== 'razorpay' && (
              <div className="payment-info-box">
                <p className="info-title">ℹ️ How to Complete Payment</p>
                <ul>
                  {paymentMethod === 'upi' && (
                    <>
                      <li>A UPI payment request will be generated</li>
                      <li>Complete the payment using your preferred UPI app</li>
                      <li>Funds will be added to your wallet within 1-2 hours</li>
                    </>
                  )}
                  {paymentMethod === 'bank_transfer' && (
                    <>
                      <li>You will receive bank transfer details</li>
                      <li>Transfer funds from your bank account</li>
                      <li>Reference ID will be provided for tracking</li>
                      <li>Funds added within 2-4 business hours</li>
                    </>
                  )}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={processing || !topupAmount}
            >
              {processing ? 'Processing...' : `Add ₹${topupAmount || '0'} to Wallet`}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div className="transactions-section">
          <h3>📋 Recent Transactions</h3>
          <div className="transactions-list">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction._id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">
                    {getTransactionIcon(transaction.type)}
                    <div className="type-details">
                      <span className="type-label">
                        {getTransactionLabel(transaction.type)}
                      </span>
                      <span className="type-date">
                        {new Date(transaction.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="transaction-amount">
                  <span className={`amount ${transaction.type.includes('deduct') ? 'negative' : 'positive'}`}>
                    {transaction.type.includes('deduct') ? '-' : '+'}₹{transaction.amount?.toFixed(2)}
                  </span>
                  <span className={`status status-${transaction.status}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get transaction icon
const getTransactionIcon = (type) => {
  const icons = {
    wallet_topup: '💰',
    earning_booking: '📅',
    earning_product: '📦',
    commission_deducted: '💸',
    withdrawal_initiated: '🏧',
    manual_credit: '➕',
    manual_debit: '➖',
  };
  return icons[type] || '💳';
};

// Helper function to get transaction label
const getTransactionLabel = (type) => {
  const labels = {
    wallet_topup: 'Wallet Top-up',
    earning_booking: 'Booking Earnings',
    earning_product: 'Product Earnings',
    commission_deducted: 'Commission Deducted',
    withdrawal_initiated: 'Withdrawal Request',
    manual_credit: 'Admin Credit',
    manual_debit: 'Admin Debit',
  };
  return labels[type] || type;
};

export default ProfessionalWalletTopup;
