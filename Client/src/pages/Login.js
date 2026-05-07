import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import API_BASE_URL from '../config/apiConfig';
import { SERVICE_HIERARCHY, getHierarchyOptions } from '../config/serviceHierarchy';
import './Login.css';

function Login() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') || '').toLowerCase();
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [loginAs, setLoginAs] = useState('user');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    userType: 'customer',
    professionalCategory: [],
    professionalSubCategory: [],
    professionalSubSubCategory: [],
    professionalServiceType: [],
    profileImage: null,
    panCardNumber: '',
    aadhaarCardNumber: '',
    panCardImage: null,
    aadhaarCardImage: null,
    experience: '',
    bio: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Geolocation for city autofill
  const getCurrentCity = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('');
        return;
      }
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.state || '';
          resolve(city);
        } catch (err) {
          resolve('');
        }
      }, () => {
        resolve('');
      });
    });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setEmailError('');
    setPhoneError('');
  };

  const handleForgotPassword = () => {
    navigate('/contact');
  };

  useEffect(() => {
    const mode = (searchParams.get('mode') || '').toLowerCase();
    setIsLogin(mode !== 'signup');
  }, [searchParams]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
    if (!phone) {
      return 'Phone number is required';
    }
    if (!phoneRegex.test(phone)) {
      return 'Please enter a valid 10-digit phone number (starting with 6-9)';
    }
    return '';
  };

  const toggleArrayValue = (currentValue, targetValue) => {
    const normalizedCurrent = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
    return normalizedCurrent.includes(targetValue)
      ? normalizedCurrent.filter((item) => item !== targetValue)
      : [...normalizedCurrent, targetValue];
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const normalizedValue = type === 'checkbox'
      ? toggleArrayValue(formData[name], value)
      : value;

    // Real-time validation for email and phone
    if (name === 'email') {
      setEmailError(validateEmail(value));
    }
    if (name === 'phone') {
      setPhoneError(validatePhone(value));
    }

    if (name === 'userType' && value !== 'professional') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        professionalCategory: [],
        professionalSubCategory: [],
        professionalSubSubCategory: [],
        professionalServiceType: [],
        profileImage: null,
        panCardNumber: '',
        aadhaarCardNumber: '',
        panCardImage: null,
        aadhaarCardImage: null,
        experience: '',
        bio: ''
      }));
      return;
    }

    if (name === 'professionalCategory') {
      setFormData(prev => ({
        ...prev,
        professionalCategory: normalizedValue,
        professionalSubCategory: [],
        professionalSubSubCategory: [],
        professionalServiceType: [],
      }));
      return;
    }

    if (name === 'professionalSubCategory') {
      setFormData(prev => ({
        ...prev,
        professionalSubCategory: normalizedValue,
        professionalSubSubCategory: [],
        professionalServiceType: [],
      }));
      return;
    }

    if (name === 'professionalSubSubCategory') {
      setFormData(prev => ({
        ...prev,
        professionalSubSubCategory: normalizedValue,
        professionalServiceType: [],
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: normalizedValue
    }));
  };

  const isArrayChecked = (field, value) => {
    const current = formData[field];
    return Array.isArray(current) && current.includes(value);
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const selectedFile = files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedFile,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');
    setPhoneError('');
    setLoading(true);


    try {
      // Validation for SignUp (not login)
      if (!isLogin) {
        // Password match
        if (formData.password !== formData.confirmPassword) {
          setError('Password and confirm password must match');
          setLoading(false);
          return;
        }
        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        // Phone format (10 digits, allow +91, spaces, dashes)
        const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.phone)) {
          setError('Please enter a valid 10-digit phone number.');
          setLoading(false);
          return;
        }
      }

      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      let requestUrl = `${API_BASE_URL}${endpoint}`;
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : null;

      if (isLogin && loginAs === 'admin') {
        requestUrl = `${API_BASE_URL}/admin/login`;
      }

      let currentCity = '';
      if (isLogin) {
        currentCity = await getCurrentCity();
        payload.currentCity = currentCity;
      }

      let response;
      let data;
      if (isLogin) {
        response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        data = await response.json();

        if (!response.ok) {
          console.error('Login failed response:', data);
          setError(data.message || 'Login failed');
          return;
        }
      } else {
        // Strict validation for customer required fields
        if (formData.userType !== 'professional') {
          if (!formData.name || !formData.email || !formData.password) {
            setError('Name, email, and password are required for customer registration.');
            setLoading(false);
            return;
          }
        }
        const registerData = new FormData();
        registerData.append('name', formData.name);
        registerData.append('email', formData.email);
        registerData.append('password', formData.password);
        registerData.append('phone', formData.phone);
        registerData.append('city', formData.city);
        registerData.append('userType', formData.userType);

        if (formData.userType === 'professional') {
          const selectedCategories = Array.isArray(formData.professionalCategory)
            ? formData.professionalCategory
            : formData.professionalCategory ? [formData.professionalCategory] : [];
          const selectedSubCategories = Array.isArray(formData.professionalSubCategory)
            ? formData.professionalSubCategory
            : formData.professionalSubCategory ? [formData.professionalSubCategory] : [];

          // Strict validation for all required professional fields
          if (
            !selectedCategories.length ||
            !selectedSubCategories.length ||
            !formData.panCardNumber ||
            !formData.aadhaarCardNumber ||
            !formData.panCardImage ||
            !formData.aadhaarCardImage
          ) {
            setError('All professional fields are required: Category, Subcategory, PAN number, Aadhaar number, PAN image, Aadhaar image.');
            setLoading(false);
            return;
          }

          selectedCategories.forEach((category) => registerData.append('professionalCategory', category));
          selectedSubCategories.forEach((subcategory) => registerData.append('professionalSubCategory', subcategory));
          (Array.isArray(formData.professionalSubSubCategory) ? formData.professionalSubSubCategory : [formData.professionalSubSubCategory])
            .filter(Boolean)
            .forEach((subSubCategory) => registerData.append('professionalSubSubCategory', subSubCategory));
          (Array.isArray(formData.professionalServiceType) ? formData.professionalServiceType : [formData.professionalServiceType])
            .filter(Boolean)
            .forEach((serviceType) => registerData.append('professionalServiceType', serviceType));
          registerData.append('currentCity', formData.city || '');
          if (formData.profileImage) {
            registerData.append('profileImage', formData.profileImage);
          }
          registerData.append('panCardNumber', formData.panCardNumber);
          registerData.append('aadhaarCardNumber', formData.aadhaarCardNumber);
          registerData.append('panCardImage', formData.panCardImage);
          registerData.append('aadhaarCardImage', formData.aadhaarCardImage);
          registerData.append('experience', formData.experience || '0');
          registerData.append('bio', formData.bio);
        }

        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          body: registerData
        });

        data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Registration failed');
          return;
        }
      }

      if (!isLogin && data.requiresApproval) {
        // Registration for professional: show message and redirect to login
        setTimeout(() => {
          setIsLogin(true);
          setError('Registration submitted. Wait for admin approval before login. Redirecting to sign-in...');
        }, 100);
        setTimeout(() => {
          setError('');
          navigate('/login');
        }, 2500);
        return;
      }
      if (!isLogin && !data.requiresApproval) {
        // Registration for customer: redirect to login
        setTimeout(() => {
          setIsLogin(true);
          setError('Registration successful! Redirecting to sign-in...');
        }, 100);
        setTimeout(() => {
          setError('');
          navigate('/login');
        }, 2000);
        return;
      }

      if (isLogin) {
        if (loginAs === 'admin' || data.admin) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminEmail', data.admin?.email || data.user?.email || formData.email);
          setSuccess('Login successful! Redirecting to admin dashboard...');
          setTimeout(() => navigate('/admin/dashboard'), 600);
          return;
        }

        localStorage.setItem('userToken', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 600);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const professionalCategories = Object.keys(SERVICE_HIERARCHY);
  const hierarchyOptions = getHierarchyOptions(
    formData.professionalCategory,
    formData.professionalSubCategory,
    formData.professionalSubSubCategory
  );
  const professionalSubCategories = hierarchyOptions.subCategories;
  const professionalSubSubCategories = hierarchyOptions.subSubCategories;
  const professionalServiceTypes = hierarchyOptions.serviceTypes;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>{isLogin ? 'Login' : 'Create Account'}</h1>
          <p>{isLogin ? 'Welcome back!' : 'Join our community'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {isLogin && (
            <div className="form-group">
              <label htmlFor="loginAs">Login As</label>
              <select
                id="loginAs"
                value={loginAs}
                onChange={(e) => setLoginAs(e.target.value)}
                disabled={loading}
              >
                <option value="user">User</option>
                <option value="professional">Professional</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  disabled={loading}
                />
                {phoneError && <div className="field-error">{phoneError}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="userType">Account Type</label>
                <select
                  id="userType"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="customer">Customer</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              {formData.userType === 'professional' && (
                <>
                  <div className="form-group">
                    <label>Professional Category</label>
                    <div className="checkbox-group">
                      {professionalCategories.map((category) => (
                        <label key={category} className="checkbox-label">
                          <input
                            type="checkbox"
                            name="professionalCategory"
                            value={category}
                            checked={isArrayChecked('professionalCategory', category)}
                            onChange={handleChange}
                            disabled={loading}
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                    <small className="hint-text">Select one or more professional categories.</small>
                  </div>

                  <div className="form-group">
                    <label>Professional Subcategory</label>
                    <div className="checkbox-group">
                      {professionalSubCategories.map((subCategory) => (
                        <label key={subCategory} className="checkbox-label">
                          <input
                            type="checkbox"
                            name="professionalSubCategory"
                            value={subCategory}
                            checked={isArrayChecked('professionalSubCategory', subCategory)}
                            onChange={handleChange}
                            disabled={loading || !formData.professionalCategory.length}
                          />
                          {subCategory}
                        </label>
                      ))}
                    </div>
                    <small className="hint-text">Choose one or more professional subcategories.</small>
                  </div>

                  <div className="form-group">
                    <label>Sub-Subcategory</label>
                    <div className="checkbox-group">
                      {professionalSubSubCategories.map((subSubCategory) => (
                        <label key={subSubCategory} className="checkbox-label">
                          <input
                            type="checkbox"
                            name="professionalSubSubCategory"
                            value={subSubCategory}
                            checked={isArrayChecked('professionalSubSubCategory', subSubCategory)}
                            onChange={handleChange}
                            disabled={loading || !formData.professionalSubCategory.length}
                          />
                          {subSubCategory}
                        </label>
                      ))}
                    </div>
                    <small className="hint-text">Choose one or more sub-subcategories.</small>
                  </div>

                  <div className="form-group">
                    <label>Next Subcategory</label>
                    <div className="checkbox-group">
                      {professionalServiceTypes.map((serviceType) => (
                        <label key={serviceType} className="checkbox-label">
                          <input
                            type="checkbox"
                            name="professionalServiceType"
                            value={serviceType}
                            checked={isArrayChecked('professionalServiceType', serviceType)}
                            onChange={handleChange}
                            disabled={loading || !formData.professionalSubSubCategory.length}
                          />
                          {serviceType}
                        </label>
                      ))}
                    </div>
                    <small className="hint-text">Choose one or more next subcategories.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="profileImage">Professional Photo</label>
                    <input
                      type="file"
                      id="profileImage"
                      name="profileImage"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="panCardNumber">PAN Card Number</label>
                    <input
                      type="text"
                      id="panCardNumber"
                      name="panCardNumber"
                      value={formData.panCardNumber}
                      onChange={handleChange}
                      placeholder="ABCDE1234F"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="aadhaarCardNumber">Aadhaar Card Number</label>
                    <input
                      type="text"
                      id="aadhaarCardNumber"
                      name="aadhaarCardNumber"
                      value={formData.aadhaarCardNumber}
                      onChange={handleChange}
                      placeholder="12-digit Aadhaar number"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="panCardImage">PAN Card Image</label>
                    <input
                      type="file"
                      id="panCardImage"
                      name="panCardImage"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="aadhaarCardImage">Aadhaar Card Image</label>
                    <input
                      type="file"
                      id="aadhaarCardImage"
                      name="aadhaarCardImage"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="experience">Experience (Years)</label>
                    <input
                      type="number"
                      id="experience"
                      name="experience"
                      min="0"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="e.g. 3"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bio">Short Bio (Work You Know)</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Example: Hair cutting, facial, cleanup, bridal makeup"
                      disabled={loading}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
            {emailError && <div className="field-error">{emailError}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
            {isLogin && (
              <button
                type="button"
                className="forgot-password-btn"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Creating account...') : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button 
              type="button"
              onClick={toggleMode}
              className="toggle-btn"
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
