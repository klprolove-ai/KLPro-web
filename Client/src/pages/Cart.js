import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import ProductPaymentIntegration from '../components/Payment/ProductPaymentIntegration';
import './Cart.css';
import {
  clearCart,
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from '../utils/cart';

const ORDERS_STORAGE_KEY = 'klproOrders';

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    paymentMethod: 'cod',
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setCartItems(getCartItems());

    const storedUserRaw = localStorage.getItem('user');
    if (storedUserRaw) {
      try {
        const storedUser = JSON.parse(storedUserRaw);
        setCheckoutForm((previous) => ({
          ...previous,
          fullName: storedUser?.name || previous.fullName,
          email: storedUser?.email || previous.email,
          phone: storedUser?.phone || previous.phone,
        }));
      } catch (error) {
        // Ignore parse issues and keep defaults.
      }
    }
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const shipping = cartItems.length > 0 ? (subtotal >= 2000 ? 0 : 99) : 0;
  const tax = cartItems.length > 0 ? subtotal * 0.05 : 0;
  const total = subtotal + shipping + tax;

  const refreshCart = (nextItems) => {
    setCartItems(nextItems);
    setOrderSuccess(null);
  };

  const handleQuantityChange = (productId, quantity) => {
    const nextItems = updateCartItemQuantity(productId, quantity);
    refreshCart(nextItems);
  };

  const handleRemove = (productId) => {
    const nextItems = removeCartItem(productId);
    refreshCart(nextItems);
  };

  const handleClearCart = () => {
    const nextItems = clearCart();
    refreshCart(nextItems);
  };

  const handleCheckoutInput = (field, value) => {
    setCheckoutForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (!cartItems.length) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    const requiredFields = ['fullName', 'email', 'phone', 'address', 'city', 'pincode'];
    const missingField = requiredFields.find((field) => !checkoutForm[field]?.trim());

    if (missingField) {
      setCheckoutError('Please complete all shipping details.');
      return;
    }

    try {
      setCheckoutError('');
      const token = localStorage.getItem('token');

      // Create product order on backend
      const response = await axios.post(
        `${API_BASE_URL}/products/create-order`,
        {
          products: cartItems.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          shippingDetails: {
            fullName: checkoutForm.fullName,
            email: checkoutForm.email,
            phone: checkoutForm.phone,
            address: checkoutForm.address,
            city: checkoutForm.city,
            pincode: checkoutForm.pincode,
          },
          subtotal,
          shipping,
          tax,
          total,
          paymentMethod: checkoutForm.paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const orderId = response.data.data.orderId;

      if (checkoutForm.paymentMethod === 'online') {
        // Show payment UI
        setPendingPaymentOrder({
          orderId,
          total,
          items: cartItems,
          shippingDetails: {
            fullName: checkoutForm.fullName,
            email: checkoutForm.email,
            phone: checkoutForm.phone,
          },
        });
      } else {
        // Cash on delivery
        const order = {
          id: orderId,
          items: cartItems,
          customer: checkoutForm,
          subtotal,
          shipping,
          tax,
          total,
          paymentMethod: checkoutForm.paymentMethod,
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        };

        const existingOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order, ...existingOrders]));

        clearCart();
        setCartItems([]);
        setCheckoutError('');
        setOrderSuccess(order);
      }
    } catch (error) {
      setCheckoutError(error.response?.data?.message || 'Failed to create order');
      console.error('Order creation error:', error);
    }
  };

  return (
    <div className="cart-page">
      <section className="cart-hero">
        <div className="cart-hero-overlay" />
        <div className="cart-hero-content">
          <p className="eyebrow">Checkout</p>
          <h1>Complete your order</h1>
          <p>Review your cart, fill in delivery details, and place your order in one flow.</p>
        </div>
      </section>

      <div className="container cart-layout">
        <section className="cart-items-panel">
          <div className="panel-header">
            <div>
              <h2>Order Items</h2>
              <p>{cartItems.length} items</p>
            </div>
            {cartItems.length > 0 && (
              <button className="clear-btn" type="button" onClick={handleClearCart}>
                Clear Cart
              </button>
            )}
          </div>

          {cartItems.length > 0 ? (
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <article key={item.id} className="cart-item-card">
                  <div className="cart-item-image">
                    {item.image ? <img src={item.image} alt={item.name} /> : <div className="image-placeholder">📦</div>}
                  </div>
                  <div className="cart-item-content">
                    <div className="cart-item-top">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.category}</p>
                      </div>
                      <button className="remove-btn" type="button" onClick={() => handleRemove(item.id)}>
                        Remove
                      </button>
                    </div>

                    <div className="cart-item-bottom">
                      <div className="quantity-control">
                        <label htmlFor={`qty-${item.id}`}>Qty</label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                        />
                      </div>
                      <div className="price-block">
                        <span>₹{item.price}</span>
                        <strong>₹{item.price * item.quantity}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-cart">
              {orderSuccess ? (
                <div className="order-success-card">
                  <p className="success-label">Order placed successfully</p>
                  <h3>{orderSuccess.id}</h3>
                  <p>Your payment method: {orderSuccess.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                  <button type="button" onClick={() => navigate('/products')}>
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <p>Your cart is empty.</p>
                  <button type="button" onClick={() => navigate('/products')}>
                    Continue Shopping
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="cart-summary-panel">
          {pendingPaymentOrder ? (
            <div className="summary-card">
              <ProductPaymentIntegration
                orderId={pendingPaymentOrder.orderId}
                amount={pendingPaymentOrder.total}
                items={pendingPaymentOrder.items}
                shippingDetails={pendingPaymentOrder.shippingDetails}
                onPaymentComplete={(paymentData) => {
                  const order = {
                    id: pendingPaymentOrder.orderId,
                    items: pendingPaymentOrder.items,
                    customer: checkoutForm,
                    subtotal,
                    shipping,
                    tax,
                    total: pendingPaymentOrder.total,
                    paymentMethod: 'online',
                    paymentId: paymentData.paymentId,
                    createdAt: new Date().toISOString(),
                    status: 'confirmed',
                  };

                  const existingOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
                  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order, ...existingOrders]));

                  clearCart();
                  setCartItems([]);
                  setPendingPaymentOrder(null);
                  setOrderSuccess(order);
                }}
              />
            </div>
          ) : orderSuccess ? (
            <div className="summary-card success-summary-card">
              <p className="success-label">Order confirmed</p>
              <h2>Thanks, {orderSuccess.customer.fullName}</h2>
              <p className="success-copy">
                Your order has been placed and will be delivered to your address shortly.
              </p>
              <div className="summary-row">
                <span>Order ID</span>
                <strong>{orderSuccess.id}</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>₹{orderSuccess.total.toFixed(2)}</strong>
              </div>
              <div className="summary-row">
                <span>Payment Method</span>
                <strong>{orderSuccess.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery'}</strong>
              </div>
              <button className="checkout-btn" type="button" onClick={() => navigate('/products')}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <form className="summary-card checkout-form-card" onSubmit={placeOrder}>
              <h2>Checkout Details</h2>

              <div className="checkout-fields">
                <label>
                  Full Name
                  <input type="text" value={checkoutForm.fullName} onChange={(e) => handleCheckoutInput('fullName', e.target.value)} />
                </label>
                <label>
                  Email
                  <input type="email" value={checkoutForm.email} onChange={(e) => handleCheckoutInput('email', e.target.value)} />
                </label>
                <label>
                  Phone
                  <input type="tel" value={checkoutForm.phone} onChange={(e) => handleCheckoutInput('phone', e.target.value)} />
                </label>
                <label className="checkout-full-row">
                  Address
                  <textarea rows="3" value={checkoutForm.address} onChange={(e) => handleCheckoutInput('address', e.target.value)} />
                </label>
                <label>
                  City
                  <input type="text" value={checkoutForm.city} onChange={(e) => handleCheckoutInput('city', e.target.value)} />
                </label>
                <label>
                  Pincode
                  <input type="text" value={checkoutForm.pincode} onChange={(e) => handleCheckoutInput('pincode', e.target.value)} />
                </label>
              </div>

              <div className="payment-methods">
                <p>Payment Method</p>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={checkoutForm.paymentMethod === 'cod'}
                    onChange={(e) => handleCheckoutInput('paymentMethod', e.target.value)}
                  />
                  Cash on Delivery
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={checkoutForm.paymentMethod === 'online'}
                    onChange={(e) => handleCheckoutInput('paymentMethod', e.target.value)}
                  />
                  Online Payment
                </label>
              </div>

              <div className="summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <strong>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</strong>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <strong>₹{tax.toFixed(2)}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>

              {checkoutError && <div className="checkout-error">{checkoutError}</div>}

              <button className="checkout-btn" type="submit" disabled={!cartItems.length}>
                Place Order
              </button>
              <Link className="secondary-link" to="/products">
                Back to Products
              </Link>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Cart;
