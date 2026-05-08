import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WalletDashboard.css';

const WalletDashboard = () => {
  const [walletData, setWalletData] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('yearly');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    if (walletData) {
      fetchEarningsReport();
    }
  }, [period]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wallet/details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/wallet/earnings-report?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnings(response.data);
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="wallet-dashboard">
        <div className="skeleton-loader">
          <div className="skeleton-box skeleton-large"></div>
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-dashboard">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (!walletData) {
    return <div className="wallet-dashboard"><p>No wallet data available</p></div>;
  }

  return (
    <div className="wallet-dashboard">
      {/* Header */}
      <div className="wallet-header">
        <h2>Professional Wallet</h2>
        <button 
          onClick={handleRefresh} 
          className="btn-refresh"
          disabled={refreshing}
          title="Refresh wallet data"
        >
          {refreshing ? '⟳' : '⟲'}
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="balance-card">
        <div className="balance-content">
          <div className="balance-label">Current Balance</div>
          <div className="balance-amount">
            ₹{walletData.currentBalance?.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) || '0.00'}
          </div>
          <div className="balance-status">
            Status: <span className={`status-badge ${walletData.status}`}>
              {walletData.status?.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="balance-actions">
          <a href="/professional/bank-details" className="action-link">
            💳 Bank Details
          </a>
          <a href="/professional/withdraw" className="action-link">
            🏦 Withdraw
          </a>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="earnings-grid">
        <div className="stat-card">
          <div className="stat-label">Total Earnings</div>
          <div className="stat-value">
            ₹{walletData.totalEarnings?.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) || '0.00'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Withdrawn</div>
          <div className="stat-value">
            ₹{walletData.totalWithdrawn?.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) || '0.00'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Commission Deducted</div>
          <div className="stat-value">
            ₹{(walletData.totalEarnings - walletData.currentBalance - walletData.totalWithdrawn)?.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) || '0.00'}
          </div>
        </div>
      </div>

      {/* Earnings by Period */}
      <div className="earnings-section">
        <div className="section-header">
          <h3>Earnings Breakdown</h3>
          <div className="period-selector">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {earnings && (
          <div className="earnings-breakdown">
            <div className="breakdown-item">
              <span className="label">Total Earnings:</span>
              <span className="value positive">
                ₹{earnings.totalEarnings?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || '0.00'}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="label">Commission (10%):</span>
              <span className="value negative">
                -₹{earnings.totalCommission?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || '0.00'}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="label">Net Earned:</span>
              <span className="value highlight">
                ₹{(earnings.totalEarnings - earnings.totalCommission)?.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || '0.00'}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="label">Transaction Count:</span>
              <span className="value">{earnings.count || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="quick-links">
        <a href="/professional/transactions" className="link-card">
          <span className="icon">📊</span>
          <span className="text">Transaction History</span>
        </a>
        <a href="/professional/withdrawals" className="link-card">
          <span className="icon">🏦</span>
          <span className="text">Withdrawal History</span>
        </a>
        <a href="/refunds" className="link-card">
          <span className="icon">↩️</span>
          <span className="text">My Refunds</span>
        </a>
        <a href="/payments" className="link-card">
          <span className="icon">💳</span>
          <span className="text">Payment History</span>
        </a>
      </div>

      {/* Wallet Suspension Warning */}
      {walletData.status !== 'active' && (
        <div className="warning-banner">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            Your wallet is currently {walletData.status}. 
            Please contact support if you need assistance.
          </span>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
