import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import { SERVICE_HIERARCHY, getHierarchyOptions } from '../config/serviceHierarchy';
import { getSocket, disconnectSocket } from '../api/socket';
import { useCall } from '../context/CallContext';
import LocationPopup from '../components/LocationPopup';
import './ProfessionalDashboard.css';

const formatCurrency = (amount) => `INR ${Number(amount || 0).toLocaleString('en-IN')}`;

function ProfessionalDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
  const { startKycVideoCall, isCallBusy } = useCall();

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [professionalRecordId, setProfessionalRecordId] = useState('');
  const [profileForm, setProfileForm] = useState({
    category: '',
    subCategory: '',
    subSubCategory: '',
    serviceType: '',
    currentCity: '',
    bio: '',
    experience: '',
    availability: [],
    servicePricing: [],
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationScheduledAt, setVerificationScheduledAt] = useState('');
  const [verificationScheduledTime, setVerificationScheduledTime] = useState('');
  const [verificationNotification, setVerificationNotification] = useState('');
  const [verificationMeetingLink, setVerificationMeetingLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isKycCalling, setIsKycCalling] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!token) return;
    getSocket(token);

    return () => {
      disconnectSocket();
    };
  }, [token]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [profileResponse, jobsResponse, professionalResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/bookings/professional/my-jobs`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/professionals/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            disconnectSocket();
            localStorage.removeItem('userToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
            return;
          }
          if (profileResponse.status === 403) {
            disconnectSocket();
            localStorage.removeItem('userToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
            return;
          }
          throw new Error('Failed to load profile');
        }

        const profileData = await profileResponse.json();
        if (profileData?.userType !== 'professional') {
          navigate('/profile');
          return;
        }

        setProfile(profileData);
        setProfileImagePreview(profileData?.profileImage || '');

        if (!jobsResponse.ok) {
          if (jobsResponse.status === 404) {
            setJobs([]);
            setApprovalStatus(profileData.approvalStatus || 'pending');
          } else {
            throw new Error('Failed to load work orders');
          }

        } else {
          const jobsData = await jobsResponse.json();
          setJobs(Array.isArray(jobsData?.bookings) ? jobsData.bookings : []);
          setApprovalStatus(jobsData?.approvalStatus || profileData.approvalStatus || 'approved');
          setProfessionalRecordId(String(jobsData?.professionalId || ''));
        }

        if (professionalResponse.ok) {
          const professionalData = await professionalResponse.json();
          const specializations = Array.isArray(professionalData?.specializations)
            ? professionalData.specializations
            : [];

          const resolvedCategory =
            professionalData?.category ||
            specializations[0] ||
            '';

          const resolvedSubCategory =
            professionalData?.subCategory ||
            specializations[1] ||
            specializations[0] ||
            '';

          setProfileForm({
            category: resolvedCategory,
            subCategory: resolvedSubCategory,
            subSubCategory: professionalData?.subSubCategory || '',
            serviceType: professionalData?.serviceType || '',
            currentCity: professionalData?.currentCity || profileData?.city || '',
            bio: professionalData?.bio || '',
            experience: String(professionalData?.experience ?? ''),
            availability: Array.isArray(professionalData?.availability)
              ? professionalData.availability
              : [],
            servicePricing: Array.isArray(professionalData?.services)
              ? professionalData.services.map((item) => ({
                  serviceName: item?.serviceName || '',
                  serviceId: item?.serviceId || '',
                  price: String(item?.price || ''),
                }))
              : [],
          });
          setApprovalStatus(professionalData?.approvalStatus || profileData.approvalStatus || 'approved');
          setVerificationStatus(professionalData?.verificationStatus || 'pending');
          setVerificationScheduledAt(professionalData?.verificationScheduledAt || '');
          setVerificationScheduledTime(professionalData?.verificationScheduledTime || '');
          setVerificationNotification(professionalData?.verificationNotification || '');
          setVerificationMeetingLink(professionalData?.verificationMeetingLink || '');
          setProfileImagePreview(professionalData?.userId?.profileImage || profileData?.profileImage || '');
          setProfessionalRecordId(String(professionalData?._id || ''));

          if (String(professionalData?.approvalStatus || profileData.approvalStatus || '').toLowerCase() === 'rejected') {
            disconnectSocket();
            localStorage.removeItem('userToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
            return;
          }
        } else if (professionalResponse.status !== 404) {
          setError('Unable to load existing professional profile details.');
        }
      } catch (fetchError) {
        setError(fetchError.message || 'Failed to load professional dashboard');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return undefined;

    let mounted = true;

    const syncVerificationState = async () => {
      try {
        const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          if (profileResponse.status === 403) {
            disconnectSocket();
            localStorage.removeItem('userToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
          return;
        }

        const profileData = await profileResponse.json();
        if (String(profileData?.approvalStatus || '').toLowerCase() === 'rejected') {
          disconnectSocket();
          localStorage.removeItem('userToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        const professionalResponse = await fetch(`${API_BASE_URL}/professionals/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!professionalResponse.ok) return;

        const professionalData = await professionalResponse.json();
        if (!mounted) return;

        setApprovalStatus(professionalData?.approvalStatus || profileData.approvalStatus || 'approved');
        setVerificationStatus(professionalData?.verificationStatus || 'pending');
        setVerificationScheduledAt(professionalData?.verificationScheduledAt || '');
        setVerificationScheduledTime(professionalData?.verificationScheduledTime || '');
        setVerificationNotification(professionalData?.verificationNotification || '');
        setVerificationMeetingLink(professionalData?.verificationMeetingLink || '');
      } catch (syncError) {
        console.error('Failed to sync professional verification state:', syncError);
      }
    };

    const timer = setInterval(syncVerificationState, 20000);
    syncVerificationState();

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket(token);
    let mounted = true;

    const refreshJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/professional/my-jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;
        const jobsData = await response.json();
        if (!mounted) return;
        setJobs(Array.isArray(jobsData?.bookings) ? jobsData.bookings : []);
        setApprovalStatus(jobsData?.approvalStatus || 'approved');
        setProfessionalRecordId(String(jobsData?.professionalId || ''));
      } catch (pollError) {
        console.error('Refreshing jobs failed:', pollError);
      }
    };

    const handleJobUpdate = () => {
      refreshJobs();
    };

    socket.on('booking-request-created', handleJobUpdate);
    socket.on('booking-status-changed', handleJobUpdate);

    return () => {
      mounted = false;
      socket.off('booking-request-created', handleJobUpdate);
      socket.off('booking-status-changed', handleJobUpdate);
    };
  }, [token]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const pending = jobs.filter((job) => job.status === 'pending').length;
    const inProgress = jobs.filter((job) => ['confirmed', 'in-progress'].includes(job.status)).length;
    const completed = jobs.filter((job) => job.status === 'completed').length;
    const earnings = jobs
      .filter((job) => job.status === 'completed')
      .reduce((sum, job) => sum + (Number(job.price) || 0), 0);

    return { total, pending, inProgress, completed, earnings };
  }, [jobs]);

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target;

    if (name === 'category') {
      setProfileForm((prev) => ({
        ...prev,
        category: value,
        subCategory: '',
        subSubCategory: '',
        serviceType: '',
      }));
      return;
    }

    if (name === 'subCategory') {
      setProfileForm((prev) => ({
        ...prev,
        subCategory: value,
        subSubCategory: '',
        serviceType: '',
      }));
      return;
    }

    if (name === 'subSubCategory') {
      setProfileForm((prev) => ({
        ...prev,
        subSubCategory: value,
        serviceType: '',
      }));
      return;
    }

    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const addServicePricingRow = () => {
    setProfileForm((prev) => ({
      ...prev,
      servicePricing: [...prev.servicePricing, { serviceName: '', serviceId: '', price: '' }],
    }));
  };

  const updateServicePricingRow = (index, field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      servicePricing: prev.servicePricing.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeServicePricingRow = (index) => {
    setProfileForm((prev) => ({
      ...prev,
      servicePricing: prev.servicePricing.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addAvailabilitySlot = () => {
    setProfileForm((prev) => ({
      ...prev,
      availability: [
        ...prev.availability,
        { day: 'Mon', startTime: '09:00', endTime: '18:00' },
      ],
    }));
  };

  const updateAvailabilitySlot = (index, field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      availability: prev.availability.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const removeAvailabilitySlot = (index) => {
    setProfileForm((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  const saveProfessionalProfile = async () => {
    try {
      setSavingProfile(true);
      setError('');
      setSaveMessage('');

      const formData = new FormData();
      formData.append('category', profileForm.category);
      formData.append('subCategory', profileForm.subCategory);
      formData.append('subSubCategory', profileForm.subSubCategory || '');
      formData.append('serviceType', profileForm.serviceType || '');
      formData.append('currentCity', profileForm.currentCity || '');
      formData.append('bio', profileForm.bio);
      formData.append('experience', String(Number(profileForm.experience) || 0));
      formData.append('availability', JSON.stringify(profileForm.availability));
      formData.append(
        'services',
        JSON.stringify(
          profileForm.servicePricing
            .filter((item) => item?.serviceName && Number(item?.price) > 0)
            .map((item) => ({
              serviceName: item.serviceName,
              serviceId: item.serviceId || undefined,
              price: Number(item.price),
            }))
        )
      );

      if (profileImageFile) {
        formData.append('profileImage', profileImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/professionals/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save professional profile');
      }

      setProfileForm({
        category: data?.category || '',
        subCategory: data?.subCategory || '',
        subSubCategory: data?.subSubCategory || '',
        serviceType: data?.serviceType || '',
        currentCity: data?.currentCity || '',
        bio: data?.bio || '',
        experience: String(data?.experience ?? ''),
        availability: Array.isArray(data?.availability) ? data.availability : [],
        servicePricing: Array.isArray(data?.services)
          ? data.services.map((item) => ({
              serviceName: item?.serviceName || '',
              serviceId: item?.serviceId || '',
              price: String(item?.price || ''),
            }))
          : [],
      });
      const updatedImage = data?.userId?.profileImage || '';
      if (updatedImage) {
        setProfileImagePreview(updatedImage);
      }
      setProfile((prev) => ({
        ...(prev || {}),
        profileImage: updatedImage || prev?.profileImage || '',
      }));
      setProfileImageFile(null);
      setSaveMessage('Professional profile updated successfully.');
      setIsEditMode(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to save professional profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleKycCallToAdmin = async () => {
    if (!professionalRecordId) {
      setError('Professional profile is not ready for KYC call yet.');
      return;
    }

    try {
      setError('');
      setIsKycCalling(true);
      await startKycVideoCall(professionalRecordId);
    } catch (callError) {
      setError(callError.message || 'Unable to start KYC video call.');
    } finally {
      setIsKycCalling(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setShowLocationPopup(true);
  };

  const handleLocationUpdate = (newLocation) => {
    setProfileForm((prev) => ({
      ...prev,
      currentCity: newLocation,
    }));
    setSaveMessage('Location updated successfully. Save changes to update your profile.');
  };

  if (loading) {
    return (
      <div className="professional-dashboard">
        <div className="professional-loading">Loading professional dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="professional-dashboard">
        <div className="professional-error">{error || 'Unable to load dashboard'}</div>
      </div>
    );
  }

  const categoryOptions = Object.keys(SERVICE_HIERARCHY);
  const hierarchyOptions = getHierarchyOptions(
    profileForm.category,
    profileForm.subCategory,
    profileForm.subSubCategory
  );

  return (
    <div className="professional-dashboard">
      <section className="pro-hero">
        <div>
          <p className="pro-kicker">Professional Workspace</p>
          <h1>Welcome, {profile.name}</h1>
          <p>Manage your service requests, update status, and track completed earnings.</p>
          {verificationStatus === 'scheduled' && (
            <button
              type="button"
              className="pro-edit-btn"
              onClick={handleKycCallToAdmin}
              disabled={isCallBusy || isKycCalling}
              style={{ marginTop: 12 }}
            >
              {isKycCalling ? 'Connecting KYC Call...' : 'Start Video KYC Call With Admin'}
            </button>
          )}
          <a 
            href="https://wa.me/8738030604" 
            target="_blank" 
            rel="noopener noreferrer"
            className="whatsapp-button pro-whatsapp"
            title="Emergency Time Connect With Whatsapp AI Doctor"
            style={{ marginTop: 12, display: 'inline-block' }}
          >
            <span>🔔 Emergency Time - Connect With Whatsapp AI Doctor</span>
          </a>
          <button
            type="button"
            onClick={() => navigate('/professional/orders-list')}
            className="pro-action-btn pro-action-btn-orders"
          >
            Product Orders
          </button>
          <button
            type="button"
            onClick={() => navigate('/professional/wallet')}
            className="pro-action-btn pro-action-btn-wallet"
          >
            Wallet Management
          </button>
          <button
            type="button"
            onClick={() => navigate('/professional/work-orders')}
            className="pro-action-btn pro-action-btn-work-orders"
          >
            Work Orders
          </button>
        </div>
        <div className={`pro-approval ${approvalStatus}`}>
          <div>Status: {approvalStatus}</div>
          <div>Verification: {verificationStatus}</div>
        </div>
      </section>

      {verificationStatus === 'scheduled' && (
        <section className="pro-profile-editor" style={{ marginTop: 0 }}>
          <div className="pro-editor-header">
            <h2>Video Verification Scheduled</h2>
            <p>
              Your first approval is complete. Join the scheduled admin video call below so the final review can be completed.
            </p>
          </div>
          <div className="pro-profile-summary">
            <p><strong>Scheduled Date:</strong> {verificationScheduledAt ? new Date(verificationScheduledAt).toLocaleDateString() : 'Not set'}</p>
            <p><strong>Scheduled Time:</strong> {verificationScheduledTime || 'Not set'}</p>
            <p><strong>Notification:</strong> {verificationNotification || 'Awaiting admin confirmation.'}</p>
            <p><strong>Video Call Option:</strong> {verificationMeetingLink || 'Use the button in the header to start the call.'}</p>
          </div>
        </section>
      )}

      {verificationStatus === 'completed' && (
        <section className="pro-profile-editor" style={{ marginTop: 0 }}>
          <div className="pro-editor-header">
            <h2>Verification Completed</h2>
            <p>Your professional profile is now visible to customers.</p>
          </div>
        </section>
      )}

      {verificationStatus === 'rejected' && (
        <section className="pro-profile-editor" style={{ marginTop: 0 }}>
          <div className="pro-editor-header">
            <h2>Account Suspended</h2>
            <p>Your video verification was rejected. Contact admin support for next steps.</p>
          </div>
        </section>
      )}

      {error && <div className="professional-error">{error}</div>}

      <section className="pro-stats-grid">
        <article><span>Total Jobs</span><strong>{stats.total}</strong></article>
        <article><span>Pending</span><strong>{stats.pending}</strong></article>
        <article><span>In Progress</span><strong>{stats.inProgress}</strong></article>
        <article><span>Completed</span><strong>{stats.completed}</strong></article>
        <article><span>Total Earnings</span><strong>{formatCurrency(stats.earnings)}</strong></article>
      </section>

      <section className="pro-profile-editor">
        <div className="pro-editor-header">
          <h2>Edit Professional Profile</h2>
          <p>Keep your public profile updated so customers can trust and book you faster.</p>
          {!isEditMode ? (
            <button type="button" className="pro-edit-btn" onClick={() => setIsEditMode(true)}>
              Edit
            </button>
          ) : null}
        </div>

        {saveMessage && <div className="professional-success">{saveMessage}</div>}

        {isEditMode ? (
          <>
            <div className="pro-editor-grid">
              <label className="pro-editor-full pro-image-field">
                Profile Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setProfileImageFile(file);

                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setProfileImagePreview(previewUrl);
                    }
                  }}
                />
                {profileImagePreview && (
                  <img
                    src={profileImagePreview}
                    alt="Professional profile preview"
                    className="pro-image-preview"
                  />
                )}
              </label>

              <label>
                Category
                <select name="category" value={profileForm.category} onChange={handleProfileFieldChange}>
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Sub Category
                <select
                  name="subCategory"
                  value={profileForm.subCategory}
                  onChange={handleProfileFieldChange}
                  disabled={!profileForm.category}
                >
                  <option value="">Select sub category</option>
                  {hierarchyOptions.subCategories.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Sub-Subcategory
                <select
                  name="subSubCategory"
                  value={profileForm.subSubCategory}
                  onChange={handleProfileFieldChange}
                  disabled={!profileForm.subCategory}
                >
                  <option value="">Select sub-subcategory</option>
                  {hierarchyOptions.subSubCategories.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Next Subcategory
                <select
                  name="serviceType"
                  value={profileForm.serviceType}
                  onChange={handleProfileFieldChange}
                  disabled={!profileForm.subSubCategory || !hierarchyOptions.serviceTypes.length}
                >
                  <option value="">Select next subcategory</option>
                  {hierarchyOptions.serviceTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Current Working City
                <div className="current-city-row">
                  <input
                    type="text"
                    name="currentCity"
                    value={profileForm.currentCity}
                    onChange={handleProfileFieldChange}
                    placeholder="Example: Delhi"
                  />
                  <button type="button" className="current-city-btn" onClick={handleUseCurrentLocation}>
                    Use My Current Location
                  </button>
                </div>
              </label>

              <label>
                Experience (Years)
                <input
                  type="number"
                  min="0"
                  name="experience"
                  value={profileForm.experience}
                  onChange={handleProfileFieldChange}
                  placeholder="Enter years of experience"
                />
              </label>

              <label className="pro-editor-full">
                Bio
                <textarea
                  name="bio"
                  rows="4"
                  value={profileForm.bio}
                  onChange={handleProfileFieldChange}
                  placeholder="Write a short intro about your skills and service quality"
                />
              </label>
            </div>

            <div className="availability-editor">
              <div className="availability-header">
                <h3>Availability Slots</h3>
                <button type="button" onClick={addAvailabilitySlot}>+ Add Slot</button>
              </div>

              {profileForm.availability.length === 0 ? (
                <p className="availability-empty">No slots added yet. Add your available days and times.</p>
              ) : (
                <div className="availability-list">
                  {profileForm.availability.map((slot, index) => (
                    <div key={`${slot.day}-${slot.startTime}-${index}`} className="availability-row">
                      <select
                        value={slot.day}
                        onChange={(e) => updateAvailabilitySlot(index, 'day', e.target.value)}
                      >
                        {weekDays.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>

                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateAvailabilitySlot(index, 'startTime', e.target.value)}
                      />

                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateAvailabilitySlot(index, 'endTime', e.target.value)}
                      />

                      <button type="button" onClick={() => removeAvailabilitySlot(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="availability-editor">
              <div className="availability-header">
                <h3>Service Pricing</h3>
                <button type="button" onClick={addServicePricingRow}>+ Add Service Price</button>
              </div>

              {profileForm.servicePricing.length === 0 ? (
                <p className="availability-empty">No custom prices added yet.</p>
              ) : (
                <div className="service-pricing-list">
                  {profileForm.servicePricing.map((item, index) => (
                    <div key={`service-pricing-${index}`} className="service-pricing-row">
                      <input
                        type="text"
                        value={item.serviceName}
                        placeholder="Service name"
                        onChange={(e) => updateServicePricingRow(index, 'serviceName', e.target.value)}
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.price}
                        placeholder="Price"
                        onChange={(e) => updateServicePricingRow(index, 'price', e.target.value)}
                      />
                      <button type="button" onClick={() => removeServicePricingRow(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pro-editor-actions">
              <button type="button" className="ghost" onClick={() => setIsEditMode(false)} disabled={savingProfile}>
                Cancel
              </button>
              <button type="button" onClick={saveProfessionalProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Professional Profile'}
              </button>
            </div>
          </>
        ) : (
          <div className="pro-profile-summary">
            {profileImagePreview ? <img src={profileImagePreview} alt="Professional" className="pro-image-preview" /> : null}
            <p><strong>Category:</strong> {profileForm.category || 'Not set'}</p>
            <p><strong>Sub Category:</strong> {profileForm.subCategory || 'Not set'}</p>
            <p><strong>Sub-Subcategory:</strong> {profileForm.subSubCategory || 'Not set'}</p>
            <p><strong>Next Subcategory:</strong> {profileForm.serviceType || 'Not set'}</p>
            <p><strong>Current Working City:</strong> {profileForm.currentCity || 'Not set'}</p>
            <p><strong>Experience:</strong> {profileForm.experience || '0'} years</p>
            <p><strong>Custom Service Prices:</strong> {profileForm.servicePricing.length}</p>
          </div>
        )}
      </section>

      <LocationPopup
        isOpen={showLocationPopup}
        onClose={() => setShowLocationPopup(false)}
        onLocationUpdate={handleLocationUpdate}
        currentLocation={profileForm.currentCity}
      />
    </div>
  );
}

export default ProfessionalDashboard;