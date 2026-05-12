import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import ProfessionalWalletTopup from '../components/Professional/ProfessionalWalletTopup';
import WithdrawalForm from '../components/Professional/WithdrawalForm';
import './ProfessionalWalletPage.css';

const ProfessionalWalletPage = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchWalletData();
  }, [navigate]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/wallet/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.data) {
        setWallet(response.data.data.wallet);
        setTransactions(response.data.data.recentTransactions || []);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet data');
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'completed': 'badge-success',
      'processing': 'badge-warning',
      'pending': 'badge-info',
      'failed': 'badge-danger',
      'cancelled': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getTransactionTypeIcon = (type) => {
    const icons = {
      'earning_booking': '📊',
      'earning_product': '🛍️',
      'commission_deducted': '💸',
      'withdrawal_initiated': '🏦',
      'withdrawal_completed': '✅',
      'withdrawal_failed': '❌',
      'refund': '↩️',
      'manual_credit': '➕',
      'manual_debit': '➖'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="wallet-page-container">
        <div className="skeleton-loader">
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page-container">
      <div className="wallet-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/professional/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <h1>💰 Wallet Management</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Wallet Overview Cards */}
      {wallet && (
        <div className="wallet-overview">
          <div className="overview-card balance-card">
            <div className="card-icon">💵</div>
            <div className="card-content">
              <div className="card-label">Current Balance</div>
              <div className="card-value">
                ₹{wallet.currentBalance?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          <div className="overview-card earnings-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <div className="card-label">Total Earnings</div>
              <div className="card-value">
                ₹{wallet.totalEarnings?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          <div className="overview-card withdrawn-card">
            <div className="card-icon">🏦</div>
            <div className="card-content">
              <div className="card-label">Total Withdrawn</div>
              <div className="card-value">
                ₹{wallet.totalWithdrawn?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          <div className="overview-card commission-card">
            <div className="card-icon">💳</div>
            <div className="card-content">
              <div className="card-label">Commission Paid</div>
              <div className="card-value">
                ₹{wallet.totalCommissionPaid?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Breakdown */}
      {wallet?.earningsBreakdown && (
        <div className="earnings-breakdown">
          <h3>📊 Earnings Breakdown</h3>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="breakdown-label">Today</span>
              <span className="breakdown-value">
                ₹{wallet.earningsBreakdown.today?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">This Week</span>
              <span className="breakdown-value">
                ₹{wallet.earningsBreakdown.thisWeek?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">This Month</span>
              <span className="breakdown-value">
                ₹{wallet.earningsBreakdown.thisMonth?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">This Year</span>
              <span className="breakdown-value">
                ₹{wallet.earningsBreakdown.thisYear?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="wallet-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'topup' ? 'active' : ''}`}
          onClick={() => setActiveTab('topup')}
        >
          Add Funds
        </button>
        <button 
          className={`tab-btn ${activeTab === 'withdrawal' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdrawal')}
        >
          Withdrawal
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transaction History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('topup')}
              >
                ➕ Add Funds to Wallet
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('withdrawal')}
              >
                🏦 Request Withdrawal
              </button>
              <button 
                className="btn btn-tertiary"
                onClick={() => navigate('/professional/bank-details')}
              >
                🏧 Bank Details
              </button>
            </div>

            <div className="info-section">
              <h3>ℹ️ Wallet Information</h3>
              <ul>
                <li>💡 Your wallet balance is updated in real-time with earnings from bookings and product sales.</li>
                <li>🔒 All transactions are securely logged and tracked for transparency.</li>
                <li>💳 Minimum withdrawal amount: ₹100</li>
                <li>⏱️ Withdrawals are typically processed within 2-3 business days.</li>
                <li>🏦 Ensure your bank details are verified before requesting withdrawals.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'topup' && (
          <div className="topup-tab">
            <ProfessionalWalletTopup onSuccess={fetchWalletData} />
          </div>
        )}

        {activeTab === 'withdrawal' && (
          <div className="withdrawal-tab">
            <WithdrawalForm />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <h3>📋 Recent Transactions</h3>
            {transactions && transactions.length > 0 ? (
              <div className="transactions-list">
                {transactions.map((transaction) => (
                  <div key={transaction._id} className="transaction-item">
                    <div className="transaction-icon">
                      {getTransactionTypeIcon(transaction.type)}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-type">
                        {transaction.description || transaction.type.replace(/_/g, ' ')}
                      </div>
                      <div className="transaction-meta">
                        <span className="transaction-date">
                          {new Date(transaction.createdAt).toLocaleDateString('en-IN')}
                        </span>
                        {transaction.referenceId && (
                          <span className="transaction-ref">Ref: {transaction.referenceId}</span>
                        )}
                        {transaction.type === 'withdrawal_initiated' && transaction.withdrawalDetails?.transactionId && (
                          <span className="transaction-ref">TxnId: {transaction.withdrawalDetails.transactionId}</span>
                        )}
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span className={transaction.amount < 0 ? 'negative' : 'positive'}>
                        {transaction.amount < 0 ? '-' : '+'} ₹{Math.abs(transaction.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      <span className={`transaction-status ${getStatusBadgeClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalWalletPage;
