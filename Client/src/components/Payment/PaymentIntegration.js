import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './PaymentIntegration.css';

const PaymentIntegration = ({ bookingId, amount, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);
  const autoStartRef = useRef(false);

  // Initialize Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const verifyPayment = useCallback(async (razorpayResponse) => {
      try {
        const token = localStorage.getItem('token');

        const verifyResponse = await axios.post(`${API_BASE_URL}/payment/verify`,
          {
            razorpay_order_id: razorpayResponse.razorpay_order_id || razorpayResponse.razorpayOrderId,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id || razorpayResponse.razorpayPaymentId,
            razorpay_signature: razorpayResponse.razorpay_signature || razorpayResponse.razorpaySignature,
            paymentId: razorpayResponse.paymentId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSuccess('Payment successful!');
        setPaymentMethod(null);
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete(verifyResponse.data);
          }
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.message || 'Payment verification failed');
      } finally {
        setProcessing(false);
      }
    }, [onPaymentComplete]);

  const handleRazorpayPayment = useCallback(async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      // Create order
      const orderResponse = await axios.post(`${API_BASE_URL}/payment/create-order-booking`, 
        { 
          bookingId,
          amount,
          paymentMethod: 'razorpay',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorpayOrderId, razorpayKey, keyId, paymentId } = orderResponse.data;
      const resolvedKey = razorpayKey || keyId;

      // Open Razorpay checkout
      const options = {
        key: resolvedKey,
        amount: amount * 100,
        currency: 'INR',
        name: 'KLPro',
        description: `Booking #${bookingId}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          await verifyPayment({
            ...response,
            paymentId,
          });
        },
        prefill: {
          name: localStorage.getItem('userName') || '',
          email: localStorage.getItem('userEmail') || '',
          contact: localStorage.getItem('userPhone') || ''
        },
        theme: {
          color: '#0066cc'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create payment order');
      setProcessing(false);
    }
  }, [amount, bookingId, verifyPayment]);

  const handleCashPayment = useCallback(async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(`${API_BASE_URL}/payment/create-cash-payment`,
        {
          bookingId,
          amount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Cash payment recorded. Please pay at the service location.');
      setPaymentMethod(null);
      setTimeout(() => {
        if (onPaymentComplete) {
          onPaymentComplete(response.data);
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record cash payment');
    } finally {
      setProcessing(false);
    }
  }, [amount, bookingId, onPaymentComplete]);

  useEffect(() => {
    if (!bookingId || !amount) return;
    if (!paymentMethod) {
      setPaymentMethod('razorpay');
      return;
    }

    if (paymentMethod !== 'razorpay') return;
    if (autoStartRef.current) return;

    autoStartRef.current = true;
    handleRazorpayPayment();
  }, [amount, bookingId, paymentMethod, handleRazorpayPayment]);

  return (
    <div className="payment-integration">
      <div className="payment-header">
        <h3>💳 Payment</h3>
        <div className="amount-display">
          Amount: <span className="amount-value">₹{amount?.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!paymentMethod ? (
        <div className="payment-methods">
          <button
            className="method-card razorpay"
            onClick={() => setPaymentMethod('razorpay')}
            disabled={processing}
          >
            <div className="method-icon">💳</div>
            <div className="method-name">Online Payment</div>
            <div className="method-desc">Cards, UPI, Net Banking</div>
          </button>

          <button
            className="method-card cash"
            onClick={() => setPaymentMethod('cash')}
            disabled={processing}
          >
            <div className="method-icon">💵</div>
            <div className="method-name">Cash Payment</div>
            <div className="method-desc">Pay at service location</div>
          </button>
        </div>
      ) : (
        <div className="payment-confirmation">
          <div className="confirmation-content">
            {paymentMethod === 'razorpay' && (
              <>
                <h4>Online Payment</h4>
                <p>You will be redirected to secure payment gateway</p>
                <button
                  className="btn btn-primary"
                  onClick={handleRazorpayPayment}
                  disabled={processing}
                >
                  {processing ? 'Opening...' : 'Proceed to Payment'}
                </button>
              </>
            )}

            {paymentMethod === 'cash' && (
              <>
                <h4>Cash Payment</h4>
                <p>Please confirm that you will pay ₹{amount} in cash at the service location</p>
                <div className="cash-details">
                  <p><strong>Amount:</strong> ₹{amount}</p>
                  <p><strong>Payment Location:</strong> Service location</p>
                  <p><strong>Note:</strong> Keep proof of payment for your records</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleCashPayment}
                  disabled={processing}
                >
                  {processing ? 'Confirming...' : 'Confirm Cash Payment'}
                </button>
              </>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => setPaymentMethod(null)}
              disabled={processing}
            >
              Change Method
            </button>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="payment-info">
        <h4>💡 Payment Information</h4>
        <ul>
          <li>All payments are secure and encrypted</li>
          <li>For Razorpay: You will receive SMS confirmation</li>
          <li>For Cash: Keep the receipt for your records</li>
          <li>Processing time: Instant for online, immediate for cash</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentIntegration;
