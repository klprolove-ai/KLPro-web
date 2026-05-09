import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import API_BASE_URL from '../config/apiConfig';
import './ForgotPassword.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('mobile'); // mobile, otp, password
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Send OTP to mobile number
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!mobile) {
      setError('Please enter your mobile number');
      return;
    }

    if (mobile.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send OTP');
        return;
      }

      setSuccess(data.message);
      setStep('otp');
      setOtpTimer(600); // 10 minutes timer
      setCanResendOtp(false);

      // Start countdown timer
      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to verify OTP');
        return;
      }

      setResetToken(data.resetToken);
      setSuccess(data.message);
      setStep('password');
    } catch (err) {
      setError(err.message || 'Error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile,
          newPassword,
          resetToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to reset password');
        return;
      }

      setSuccess(data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    setCanResendOtp(false);
    setOtpTimer(600);
    handleSendOtp({ preventDefault: () => {} });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <button className="back-btn" onClick={() => navigate('/login')}>
          <AiOutlineArrowLeft /> Back to Login
        </button>

        <div className="forgot-password-card">
          <h2>Reset Your Password</h2>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {step === 'mobile' && (
            <form onSubmit={handleSendOtp}>
              <div className="step-indicator">Step 1: Enter Mobile Number</div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Enter your registered mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={loading}
                  maxLength="10"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="step-indicator">Step 2: Enter OTP</div>
              <p className="info-text">
                An OTP has been sent to <strong>+91{mobile}</strong>
              </p>
              <div className="form-group">
                <label>One-Time Password (OTP)</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength="6"
                />
              </div>
              <div className="timer-section">
                {otpTimer > 0 ? (
                  <p className="timer">OTP expires in: {formatTimer(otpTimer)}</p>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleResendOtp}
                    disabled={loading || !canResendOtp}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStep('mobile');
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
              >
                Change Mobile Number
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword}>
              <div className="step-indicator">Step 3: Set New Password</div>
              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li>At least 6 characters</li>
                </ul>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
