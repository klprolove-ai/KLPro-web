import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import { getSocket } from '../api/socket';
import { useCall } from '../context/CallContext';
import PaymentIntegration from '../components/Payment/PaymentIntegration';
import BookingCancelDialog from '../components/BookingCancelDialog';
import './Bookings.css';

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));

const formatDateInput = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createTimeOptions = () => {
  const slots = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const hours24 = Math.floor(minutes / 60);
    const minutePart = String(minutes % 60).padStart(2, '0');
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = ((hours24 + 11) % 12) + 1;
    slots.push(`${hours12}:${minutePart} ${period}`);
  }
  return slots;
};

const getProfessionalName = (professionalIdField) => {
  if (!professionalIdField) return 'Professional';
  if (typeof professionalIdField === 'string') return 'Professional';
  const userObj = professionalIdField.userId;
  if (userObj && typeof userObj === 'object' && userObj.name) return userObj.name;
  return 'Professional';
};

const getProfessionalLocation = (professionalIdField) => {
  if (!professionalIdField || typeof professionalIdField !== 'object') return null;
  return professionalIdField.currentLocation || null;
};

const formatLiveLocationLabel = (location) => {
  if (!location) return '';

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  
  // Only include coordinates if they are valid (not NaN, not 0, not null)
  const hasValidCoordinates = !Number.isNaN(latitude) && !Number.isNaN(longitude) && latitude !== 0 && longitude !== 0;
  const coordinateText = hasValidCoordinates
    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    : '';

  const updatedAt = location.updatedAt ? new Date(location.updatedAt) : null;
  const freshnessText = updatedAt && !Number.isNaN(updatedAt.getTime())
    ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Updating live';

  return [location.address, coordinateText, freshnessText].filter(Boolean).join(' · ');
};

const buildMapEmbedUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  // Check for valid coordinates (not NaN, not null, not 0 or close to 0 which indicates missing data)
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0 || lat === null || lng === null) {
    return '';
  }

  const delta = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const escapePdfText = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildEnhancedPdfBlob = (bookingData) => {
  const { booking, professional, service, user, feeBreakdown } = bookingData;
  
  // Ensure we have proper customer data - handle both populated object and string ID cases
  let customerName = 'N/A';
  let customerEmail = 'N/A';
  let customerPhone = 'N/A';
  
  if (user && typeof user === 'object') {
    customerName = user?.name || 'N/A';
    customerEmail = user?.email || 'N/A';
    customerPhone = user?.phone || 'N/A';
  } else if (booking && booking.customerId && typeof booking.customerId === 'object') {
    customerName = booking.customerId?.name || 'N/A';
    customerEmail = booking.customerId?.email || 'N/A';
    customerPhone = booking.customerId?.phone || 'N/A';
  } else if (booking && booking.userId && typeof booking.userId === 'object') {
    // Fallback for userId field
    customerName = booking.userId?.name || 'N/A';
    customerEmail = booking.userId?.email || 'N/A';
    customerPhone = booking.userId?.phone || 'N/A';
  }
  
  let currentY = 750;
  const leftMargin = 40;
  const rightMargin = 555;
  const contentStream = [];

  const addText = (text, fontSize = 11, x = leftMargin, bold = false) => {
    contentStream.push('BT');
    contentStream.push(`/${bold ? 'F2' : 'F1'} ${fontSize} Tf`);
    contentStream.push(`${x} ${currentY} Td`);
    contentStream.push(`(${escapePdfText(text)}) Tj`);
    contentStream.push('ET');
    currentY -= fontSize + 2;
  };

  const addLine = (y) => {
    contentStream.push('q');
    contentStream.push('0.5 w');
    contentStream.push(`${leftMargin} ${y} m`);
    contentStream.push(`${rightMargin} ${y} l`);
    contentStream.push('S');
    contentStream.push('Q');
  };

  const addSection = (title) => {
    currentY -= 8;
    addText(title, 12, leftMargin, true);
    currentY -= 3;
    addLine(currentY);
    currentY -= 6;
  };

  const addKeyValue = (key, value, indent = 0) => {
    addText(`${key}: ${value}`, 10, leftMargin + indent);
  };

  // Header - Company Info
  addText('KLPro Company', 16, leftMargin, true);
  addText('Professional Services Booking Invoice', 11, leftMargin);
  currentY -= 8;
  addLine(currentY);
  currentY -= 10;

  // Booking Reference
  addKeyValue('Invoice #', booking?._id || 'N/A');
  addKeyValue('Date', booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN') : 'N/A');
  currentY -= 10;

  // Customer Section
  addSection('CUSTOMER DETAILS');
  addKeyValue('Name', customerName);
  addKeyValue('Email', customerEmail);
  addKeyValue('Phone', customerPhone);

  // Professional Section
  addSection('SERVICE PROVIDER');
  addKeyValue('Name', professional?.userId?.name || 'N/A');
  addKeyValue('Email', professional?.userId?.email || 'N/A');
  addKeyValue('Phone', professional?.userId?.phone || 'N/A');

  // Service Details
  addSection('SERVICE DETAILS');
  addKeyValue('Service', service?.name || booking?.serviceId?.name || 'N/A');
  addKeyValue('Category', professional?.category || 'N/A');
  addKeyValue('Scheduled Date', booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN') : 'N/A');
  addKeyValue('Scheduled Time', booking?.scheduledTime || 'N/A');
  addKeyValue('Service Address', booking?.serviceAddress?.street ? `${booking.serviceAddress.street}, ${booking.serviceAddress.city}` : 'N/A');
  addKeyValue('Status', booking?.status || 'N/A');

  // Payment Details
  addSection('PAYMENT INFORMATION');
  addKeyValue('Payment Method', booking?.paymentMethod ? booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1) : 'N/A');
  if (booking?.razorpayPaymentId) {
    addKeyValue('Payment ID', booking.razorpayPaymentId);
  }

  // Amount Breakdown
  addSection('AMOUNT BREAKDOWN');
  const serviceCharge = Number(feeBreakdown?.totalAmount || booking?.price || 0);
  const gst = Number(feeBreakdown?.gstAmount || 0);
  const platformCharge = Number(feeBreakdown?.platformChargeAmount || 0);
  const commission = Number(feeBreakdown?.commissionAmount || 0);
  const professionalPayout = Number(feeBreakdown?.professionalPayoutAmount || 0);

  addKeyValue('Service Charge', `INR ${serviceCharge.toLocaleString('en-IN')}`, 10);
  addKeyValue('GST (on service)', `INR ${gst.toLocaleString('en-IN')}`, 10);
  addKeyValue('Platform Charge', `INR ${platformCharge.toLocaleString('en-IN')}`, 10);
  addKeyValue('Commission', `INR ${commission.toLocaleString('en-IN')}`, 10);
  currentY -= 4;
  addLine(currentY);
  currentY -= 6;
  addKeyValue('TOTAL AMOUNT', `INR ${(serviceCharge + gst + platformCharge).toLocaleString('en-IN')}`, 10);
  currentY -= 6;
  addKeyValue('Professional Payout', `INR ${professionalPayout.toLocaleString('en-IN')}`, 10);
  currentY -= 12;

  // Footer
  addLine(currentY);
  currentY -= 8;
  addText('Thank you for using KLPro Company!', 9, leftMargin);
  addText('For support, contact us at:', 8, leftMargin);
  addText('Email: info@klproind.com | Phone: +91 9711379156', 8, leftMargin);

  const contentStr = contentStream.join('\n');
  const contentBinary = new TextEncoder().encode(contentStr);
  const contentLength = contentBinary.length;

  // Build PDF objects with correct references
  const objects = [];
  
  // Object 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  
  // Object 2: Pages
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  
  // Object 3: Page (references fonts at objects 4 and 5)
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>');
  
  // Object 4: Font Helvetica
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  
  // Object 5: Font Helvetica-Bold
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  
  // Object 6: Content stream with proper encoding
  objects.push(`<< /Length ${contentLength} >>\nstream\n${contentStr}\nendstream`);

  // Build PDF file
  let pdf = '%PDF-1.4\n';
  const offsets = [];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  // Build xref table with correct offsets
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  
  for (let i = 0; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  
  // Build trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';

  return new Blob([pdf], { type: 'application/pdf' });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const downloadCsvFile = (filename, rows) => {
  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
};

const paymentOptions = [
  {
    value: 'razorpay',
    title: 'Online Payment',
    description: 'Pay securely with Razorpay using UPI, cards, or net banking.',
    accent: 'online',
    icon: '💳',
    badge: 'Recommended',
  },
  {
    value: 'cash',
    title: 'Cash Payment',
    description: 'Confirm now and pay the professional at the service location.',
    accent: 'cash',
    icon: '💵',
    badge: 'Pay later',
  },
];

function Bookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
  const { startBookingAudioCall, isCallBusy } = useCall();

  const [bookings, setBookings] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [prefillNotice, setPrefillNotice] = useState('');
  const [callingBookingId, setCallingBookingId] = useState('');
  const bookingsSnapshotRef = useRef([]);
  const bookingSoundReadyRef = useRef(false);
  const bookingAudioUnlockedRef = useRef(false);
  const pendingBookingSoundRef = useRef(false);
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);

      setTimeout(() => audioContext.close().catch(() => {}), 500);
    } catch (error) {
      // Ignore browser audio autoplay restrictions.
    }
  }, []);

  const notifyStatusChange = useCallback(() => {
    playBeep();
  }, [playBeep]);

  const unlockBookingAudio = useCallback(() => {
    if (bookingAudioUnlockedRef.current) return;

    bookingAudioUnlockedRef.current = true;
    playBeep();

    if (pendingBookingSoundRef.current) {
      pendingBookingSoundRef.current = false;
      window.setTimeout(() => {
        playBeep();
      }, 120);
    }
  }, [playBeep]);

  const [formData, setFormData] = useState({
    professionalId: '',
    serviceId: '',
    scheduledDate: formatDateInput(new Date()),
    scheduledTime: '10:00 AM',
    price: '',
    paymentMethod: 'razorpay',
    notes: '',
    serviceAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const timeOptions = useMemo(() => createTimeOptions(), []);

  const selectedProfessional = useMemo(
    () => professionals.find((prof) => String(prof._id) === String(formData.professionalId)),
    [professionals, formData.professionalId]
  );

  const filteredServices = useMemo(() => {
    if (!selectedProfessional) {
      return services;
    }

    // Try to get services from professional object
    const professionalServices = selectedProfessional?.services;
    
    // If professional has services array defined, filter based on it
    if (Array.isArray(professionalServices) && professionalServices.length > 0) {
      const professionalServiceIds = professionalServices
        .map((item) => {
          // Handle different formats: {serviceId: ...}, {_id: ...}, or just ID string
          const serviceId = item?.serviceId || item?._id || item;
          return String(serviceId).trim();
        })
        .filter(Boolean);

      if (professionalServiceIds.length > 0) {
        return services.filter((service) => 
          professionalServiceIds.includes(String(service._id))
        );
      }
    }

    // If professional has no services defined, return all services for backward compatibility
    return services;
  }, [selectedProfessional, services]);

  const selectedService = useMemo(
    () => filteredServices.find((service) => String(service._id) === String(formData.serviceId)),
    [filteredServices, formData.serviceId]
  );

  const bookingPricing = useMemo(() => {
    const serviceCharge = Number(selectedService?.basePrice) || 0;
    const gstPercentage = Number(selectedService?.gstFromCustomer) || 0;
    const platformPercentage = formData.paymentMethod === 'cash'
      ? Number(selectedService?.cashPaymentPlatformChargeFromCustomer) || 0
      : 0;
    const commissionPercentage = Number(selectedService?.commissionToKlPro) || 0;
    const gstAmount = Math.round((serviceCharge * gstPercentage) / 100);
    const platformCharge = Math.round((serviceCharge * platformPercentage) / 100);
    const commissionAmount = Math.round((serviceCharge * commissionPercentage) / 100);

    return {
      serviceCharge,
      gstAmount,
      platformCharge,
      commissionAmount,
      gstPercentage,
      platformPercentage,
      commissionPercentage,
      totalAmount: serviceCharge + gstAmount + platformCharge,
    };
  }, [selectedService, formData.paymentMethod]);

  const draftData = useMemo(() => {
    try {
      const draft = localStorage.getItem('bookingDraft');
      return draft ? JSON.parse(draft) : null;
    } catch (parseError) {
      console.error('Invalid bookingDraft JSON:', parseError);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const requestHeaders = token
          ? {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            };

        const requests = [
          fetch(`${API_BASE_URL}/professionals`, { headers: requestHeaders }),
          fetch(`${API_BASE_URL}/services`, { headers: requestHeaders }),
        ];

        if (token) {
          requests.push(fetch(`${API_BASE_URL}/bookings`, { headers: requestHeaders }));
          requests.push(fetch(`${API_BASE_URL}/users/profile`, { headers: requestHeaders }));
        }

        const [professionalsResponse, servicesResponse, bookingsResponse, profileResponse] = await Promise.all(requests);

        const professionalsData = professionalsResponse.ok ? await professionalsResponse.json() : [];
        const servicesData = servicesResponse.ok ? await servicesResponse.json() : [];

        setProfessionals(Array.isArray(professionalsData) ? professionalsData : professionalsData.professionals || []);
        setServices(Array.isArray(servicesData) ? servicesData : servicesData.services || []);

        if (token && bookingsResponse && bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        }

        if (token && profileResponse && profileResponse.ok) {
          const profile = await profileResponse.json();
          setFormData((current) => ({
            ...current,
            serviceAddress: {
              street: profile.address || current.serviceAddress.street,
              city: profile.city || current.serviceAddress.city,
              state: current.serviceAddress.state,
              zipCode: current.serviceAddress.zipCode,
            },
          }));
        }
      } catch (loadError) {
        console.error('Failed to load booking page data:', loadError);
        setError('Failed to load booking details. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  useEffect(() => {
    if (!draftData) return;

    setFormData((current) => {
      const professionalExists = professionals.some(
        (professional) => String(professional._id) === String(draftData.professionalId)
      );

      const nextProfessionalId = professionalExists ? String(draftData.professionalId) : current.professionalId;
      const nextDate = draftData.scheduledDate || current.scheduledDate;
      const nextTime = draftData.scheduledTime || current.scheduledTime;

      const serviceById = draftData.serviceId
        ? services.find((service) => String(service._id) === String(draftData.serviceId))
        : null;

      const serviceByName = draftData.serviceName
        ? services.find((service) => String(service.name || '').toLowerCase() === String(draftData.serviceName).toLowerCase())
        : null;

      const matchedService =
        serviceById ||
        serviceByName ||
        services.find((service) => {
          const haystack = `${service.name} ${service.category}`.toLowerCase();
          return haystack.includes((draftData.professionalName || '').toLowerCase());
        });

      const nextServiceId = current.serviceId || matchedService?._id || '';

      return {
        ...current,
        professionalId: nextProfessionalId,
        serviceId: String(nextServiceId),
        scheduledDate: nextDate,
        scheduledTime: nextTime,
        price: current.price || String(draftData.expectedPrice || ''),
      };
    });

    setPrefillNotice('Booking details were prefilled from your selected professional.');
  }, [draftData, professionals, services]);

  useEffect(() => {
    if (!selectedService) return;
    setFormData((current) => ({
      ...current,
      price: String(bookingPricing.totalAmount || current.price || ''),
    }));
  }, [bookingPricing.totalAmount, selectedService]);

  // Validate that selected service is available for the selected professional
  useEffect(() => {
    if (!formData.serviceId || !formData.professionalId) return;

    // Check if the currently selected service is available for the selected professional
    const isServiceAvailableForProfessional = filteredServices.some(
      (service) => String(service._id) === String(formData.serviceId)
    );

    // If service is not available, clear it
    if (!isServiceAvailableForProfessional && formData.serviceId) {
      setFormData((current) => ({
        ...current,
        serviceId: '',
      }));
    }
  }, [filteredServices, formData.serviceId, formData.professionalId]);

  // Fetch full professional details when professional ID changes to ensure we have services data
  useEffect(() => {
    if (!formData.professionalId) return;

    const fetchProfessionalDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/professionals/${formData.professionalId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const professionalDetail = await response.json();
          
          // Update the professionals array with the fetched professional details
          // This ensures we have the latest services information
          setProfessionals((prev) => {
            const existingIndex = prev.findIndex((p) => String(p._id) === String(formData.professionalId));
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = professionalDetail;
              return updated;
            }
            return prev;
          });
        }
      } catch (error) {
        console.warn('Failed to fetch professional details:', error);
      }
    };

    fetchProfessionalDetails();
  }, [formData.professionalId]);

  useEffect(() => {
    const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
    unlockEvents.forEach((eventName) => {
      window.addEventListener(eventName, unlockBookingAudio, { once: true });
    });

    return () => {
      unlockEvents.forEach((eventName) => {
        window.removeEventListener(eventName, unlockBookingAudio);
      });
    };
  }, [unlockBookingAudio]);

  const refreshBookings = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const nextBookings = Array.isArray(data) ? data : [];

        if (bookingSoundReadyRef.current) {
          const previousById = new Map(
            (Array.isArray(bookingsSnapshotRef.current) ? bookingsSnapshotRef.current : []).map((booking) => [
              String(booking?._id || booking?.id || ''),
              String(booking?.status || ''),
            ])
          );

          const changedToAttentionStatus = nextBookings.some((booking) => {
            const bookingId = String(booking?._id || booking?.id || '');
            if (!bookingId) return false;

            const previousStatus = previousById.get(bookingId);
            const nextStatus = String(booking?.status || '');
            return (
              previousStatus &&
              previousStatus !== nextStatus &&
              ['confirmed', 'rejected'].includes(nextStatus)
            );
          });

          if (changedToAttentionStatus) {
            if (bookingAudioUnlockedRef.current) {
              notifyStatusChange();
            } else {
              pendingBookingSoundRef.current = true;
            }
          }
        } else {
          bookingSoundReadyRef.current = true;
        }

        bookingsSnapshotRef.current = nextBookings;
        setBookings(nextBookings);
      }
    } catch (refreshError) {
      console.error('Failed to refresh bookings:', refreshError);
    }
  }, [notifyStatusChange, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket(token);

    const handleStatusChanged = async () => {
      await refreshBookings();
    };

    socket.on('booking-status-changed', handleStatusChanged);

    return () => {
      socket.off('booking-status-changed', handleStatusChanged);
    };
  }, [token, refreshBookings]);

  useEffect(() => {
    if (!token) return undefined;

    const intervalId = window.setInterval(() => {
      refreshBookings();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [token, refreshBookings]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    
    // If professional is changed, clear the service selection since
    // services available for the new professional might be different
    if (name === 'professionalId') {
      setFormData((current) => ({
        ...current,
        [name]: value,
        serviceId: '', // Reset service when professional changes
      }));
    } else {
      setFormData((current) => ({
        ...current,
        [name]: value,
      }));
    }
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      serviceAddress: {
        ...current.serviceAddress,
        [name]: value,
      },
    }));
  };

  const handlePaymentMethodSelect = (paymentMethod) => {
    setFormData((current) => ({
      ...current,
      paymentMethod,
    }));
  };

  const handleSubmitBooking = async (event) => {
    event.preventDefault();

    if (!token) {
      setError('Please login to confirm your booking.');
      navigate('/login');
      return;
    }

    if (!isObjectId(formData.professionalId)) {
      setError('Please select a valid professional to proceed.');
      return;
    }

    if (!isObjectId(formData.serviceId)) {
      setError('Please select a valid service to proceed.');
      return;
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Please select date and time for your appointment.');
      return;
    }

    if (!selectedService) {
      setError('Please select a service to continue.');
      return;
    }

    const parsedPrice = Number(formData.price);
    if (!parsedPrice || parsedPrice <= 0) {
      setError('Please provide a valid booking amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const payload = {
        professionalId: formData.professionalId,
        serviceId: formData.serviceId,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        serviceAddress: formData.serviceAddress,
        price: parsedPrice,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
      };

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message || 'Failed to create booking');
      }

      const createdBooking = await response.json();

      localStorage.removeItem('bookingDraft');
      if (formData.paymentMethod === 'razorpay') {
        const initialPayment = createdBooking?.payment || null;
        setPendingPaymentBooking({ bookingId: createdBooking?._id, amount: initialPayment?.amount || parsedPrice, initialPayment });
        setSuccessMessage('Booking request created. Complete your Razorpay payment below to confirm payment status.');
      } else {
        setPendingPaymentBooking(null);
        setSuccessMessage(
          createdBooking?.startOtp
            ? `Booking request sent. Share start OTP with professional at service start: ${createdBooking.startOtp}`
            : 'Booking request sent successfully. You can track it below.'
        );
      }
      setPrefillNotice('');

      setFormData((current) => ({
        ...current,
        notes: '',
      }));

      await refreshBookings();
    } catch (submitError) {
      console.error('Booking submit error:', submitError);
      setError(submitError.message || 'Failed to confirm booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = async (result = {}) => {
    setPendingPaymentBooking(null);
    if (result.cancelled) {
      setSuccessMessage('Payment cancelled. Booking has been cancelled.');
    } else {
      setSuccessMessage('Online payment completed successfully.');
    }
    await refreshBookings();
  };

  const submitButtonLabel = formData.paymentMethod === 'razorpay' ? 'Confirm & Pay Securely' : 'Confirm Booking';

  const handleDownloadBookingCsv = (booking) => {
    const professionalName = getProfessionalName(booking.professionalId);
    const professionalUser = booking?.professionalId?.userId || {};
    const rows = [
      ['Field', 'Value'],
      ['Booking ID', booking._id],
      ['Professional Name', professionalName],
      ['Professional Email', professionalUser.email || ''],
      ['Professional Phone', professionalUser.phone || ''],
      ['Service', booking?.serviceId?.name || ''],
      ['Date', booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : ''],
      ['Time', booking.scheduledTime || ''],
      ['Amount (INR)', booking.price || ''],
      ['Status', booking.status || ''],
    ];

    downloadCsvFile(`booking-${booking._id}-professional.csv`, rows);
  };

  const handleDownloadBookingPdf = (booking) => {
    const professional = booking?.professionalId || {};
    const service = booking?.serviceId || {};
    const user = booking?.customerId || {};
    
    const bookingData = {
      booking,
      professional,
      service,
      user,
      feeBreakdown: booking?.feeBreakdown || {
        totalAmount: booking?.price || 0,
        gstAmount: 0,
        platformChargeAmount: 0,
        commissionAmount: 0,
        professionalPayoutAmount: 0,
      },
    };

    const pdfBlob = buildEnhancedPdfBlob(bookingData);
    downloadBlob(pdfBlob, `KLPro_Invoice_${booking._id}.pdf`);
  };

  const handleCancelBooking = async (bookingId, reason) => {
    if (!token) {
      setError('Please login to cancel a booking.');
      return;
    }

    const cancelReason = String(reason || '').trim();
    if (!cancelReason) {
      setError('Please provide a reason for cancellation.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message || 'Failed to cancel booking');
      }

      setSuccessMessage('Booking cancelled successfully.');
      setCancelTarget(null);
      await refreshBookings();
    } catch (cancelError) {
      console.error('Booking cancel error:', cancelError);
      setError(cancelError.message || 'Failed to cancel booking');
    }
  };

  const openCancelDialog = (booking) => {
    setError('');
    setCancelTarget(booking);
  };

  const handleRebook = (booking) => {
    const professionalId = String(booking?.professionalId?._id || booking?.professionalId || '');

    if (!professionalId) {
      setError('Unable to rebook this appointment because the professional is missing.');
      return;
    }

    localStorage.setItem(
      'bookingDraft',
      JSON.stringify({
        professionalId,
        professionalName: getProfessionalName(booking.professionalId),
        serviceId: String(booking?.serviceId?._id || booking?.serviceId || ''),
        serviceName: booking?.serviceId?.name || '',
        scheduledDate: booking?.scheduledDate ? formatDateInput(new Date(booking.scheduledDate)) : formatDateInput(new Date()),
        scheduledTime: booking?.scheduledTime || '',
        selectedSlot: booking?.scheduledTime || '',
        expectedPrice: booking?.price || '',
      })
    );

    navigate(`/professionals/${professionalId}`);
  };

  const handleBookingAudioCall = async (bookingId) => {
    if (!token) {
      setError('Please login to use audio call.');
      return;
    }

    try {
      setError('');
      setCallingBookingId(bookingId);
      await startBookingAudioCall(bookingId);
    } catch (callError) {
      setError(callError.message || 'Unable to start audio call right now.');
    } finally {
      setCallingBookingId('');
    }
  };

  return (
    <div className="bookings">
      <h1>Bookings</h1>

      {!token && (
        <div className="auth-reminder">
          <p>Login is required to create and manage bookings.</p>
          <button type="button" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      )}

      {prefillNotice && <div className="alert info">{prefillNotice}</div>}
      {error && <div className="alert error">{error}</div>}
      {successMessage && <div className="alert success">{successMessage}</div>}

      <section className="booking-form-section">
        <h2>Confirm Appointment</h2>

        <form className="booking-form" onSubmit={handleSubmitBooking}>
          <div className="form-grid">
            <label>
              Professional
              <select
                name="professionalId"
                value={formData.professionalId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select professional</option>
                {professionals.map((professional) => (
                  <option key={professional._id} value={professional._id}>
                    {professional?.userId?.name || 'Professional'}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Service
              <select
                name="serviceId"
                value={formData.serviceId}
                onChange={handleInputChange}
                required
              >
                <option value="">
                  {selectedProfessional 
                    ? 'Select a service offered by this professional' 
                    : 'Select professional first'}
                </option>
                {filteredServices.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name} - INR {service.basePrice}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                type="date"
                name="scheduledDate"
                min={formatDateInput(new Date())}
                value={formData.scheduledDate}
                onChange={handleInputChange}
                required
              />
            </label>

            <label>
              Time
              <select
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                required
              >
                {timeOptions.map((timeSlot) => (
                  <option key={timeSlot} value={timeSlot}>{timeSlot}</option>
                ))}
                {!timeOptions.includes(formData.scheduledTime) && formData.scheduledTime && (
                  <option value={formData.scheduledTime}>{formData.scheduledTime}</option>
                )}
              </select>
            </label>

            <label>
              Amount (INR)
              <input
                type="number"
                name="price"
                min="1"
                value={formData.price}
                readOnly
                required
              />
            </label>

            <div className="full-width booking-breakdown-card">
              <h3>Amount Breakdown</h3>
              {selectedService ? (
                <div className="booking-breakdown-list">
                  <div className="booking-breakdown-row">
                    <span className="breakdown-label">Service Charge</span>
                    <strong className="breakdown-value">INR {bookingPricing.serviceCharge.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="booking-breakdown-row">
                    <span className="breakdown-label">GST TAX <small>({bookingPricing.gstPercentage || 0}%)</small></span>
                    <strong className="breakdown-value">INR {bookingPricing.gstAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  {formData.paymentMethod === 'cash' && (
                    <div className="booking-breakdown-row">
                      <span className="breakdown-label">Platform Charge <small>({bookingPricing.platformPercentage || 0}%)</small></span>
                      <strong className="breakdown-value">INR {bookingPricing.platformCharge.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div className="booking-breakdown-row">
                    <span className="breakdown-label">Total Amount</span>
                    <strong className="breakdown-value">INR {bookingPricing.totalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              ) : (
                <p>Select a service to see the final amount.</p>
              )}
            </div>

            <section className="payment-method-section full-width">
              <div className="payment-method-header">
                <div>
                  <p className="section-eyebrow">Step 2</p>
                  <h3>Choose payment method</h3>
                </div>
                <span className="payment-method-chip">Secure checkout</span>
              </div>

              <div className="payment-method-grid" role="radiogroup" aria-label="Payment method">
                {paymentOptions.map((option) => {
                  const isSelected = formData.paymentMethod === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`payment-option-card ${option.accent} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePaymentMethodSelect(option.value)}
                      disabled={submitting}
                      aria-pressed={isSelected}
                    >
                      <div className="payment-option-top">
                        <div className="payment-option-icon" aria-hidden="true">{option.icon}</div>
                        <span className="payment-option-badge">{option.badge}</span>
                      </div>
                      <div className="payment-option-content">
                        <h4>{option.title}</h4>
                        <p>{option.description}</p>
                      </div>
                      <div className="payment-option-footer">
                        <span className="payment-option-radio" aria-hidden="true">
                          <span className="payment-option-radio-dot" />
                        </span>
                        <span className="payment-option-cta">
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="payment-method-note">
                {formData.paymentMethod === 'razorpay'
                  ? 'After you click Confirm Booking, Razorpay will open immediately to complete your payment.'
                  : 'Cash payments will be confirmed immediately after you submit the booking.'}
              </div>
            </section>

            <label className="full-width">
              Notes (optional)
              <textarea
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any instructions for the professional"
              />
            </label>

            <label>
              Street Address
              <input
                type="text"
                name="street"
                value={formData.serviceAddress.street}
                onChange={handleAddressChange}
                required
              />
            </label>

            <label>
              City
              <input
                type="text"
                name="city"
                value={formData.serviceAddress.city}
                onChange={handleAddressChange}
                required
              />
            </label>

            <label>
              State
              <input
                type="text"
                name="state"
                value={formData.serviceAddress.state}
                onChange={handleAddressChange}
              />
            </label>

            <label>
              ZIP Code
              <input
                type="text"
                name="zipCode"
                value={formData.serviceAddress.zipCode}
                onChange={handleAddressChange}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/professionals')}>
              Change Professional
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || loading}>
              {submitting ? 'Confirming...' : submitButtonLabel}
            </button>
          </div>
        </form>

        {pendingPaymentBooking && (
          <div className="booking-payment-panel">
            <PaymentIntegration
              bookingId={pendingPaymentBooking.bookingId}
              amount={pendingPaymentBooking.amount}
              initialPayment={pendingPaymentBooking.initialPayment}
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        )}

        <BookingCancelDialog
          isOpen={Boolean(cancelTarget)}
          title="Cancel Booking"
          message="Please share a cancellation reason. This will be visible to the professional and admin."
          confirmLabel="Cancel Booking"
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => handleCancelBooking(cancelTarget?._id, reason)}
        />
      </section>

      <section className="booking-history-section">
        <div className="history-header">
          <h2>My Booking History</h2>
          <button type="button" onClick={refreshBookings}>Refresh</button>
        </div>

        {loading ? (
          <div className="no-bookings">
            <p>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="no-bookings">
            <p>No bookings yet. Confirm your first appointment above.</p>
            <button type="button" onClick={() => navigate('/services')}>Browse Services</button>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div key={booking._id || booking.id} className="booking-card">
                <div className="booking-info">
                  <h3>{booking?.serviceId?.name || 'Service'}</h3>
                  <p><strong>Professional:</strong> {getProfessionalName(booking.professionalId)}</p>
                  <p>
                    <strong>Date & Time:</strong>{' '}
                    {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : '-'} at {booking.scheduledTime || '-'}
                  </p>
                  <p><strong>Amount:</strong> INR {booking.price}</p>
                  {booking.startOtp && <p><strong>Start OTP:</strong> {booking.startOtp}</p>}
                  {booking.completionOtpIssuedAt && <p><strong>Final OTP:</strong> {booking.completionOtp}</p>}
                  {['pending', 'confirmed', 'in-progress'].includes(String(booking.status || '')) && getProfessionalLocation(booking.professionalId) && (
                    <>
                      <p>
                        <strong>Live Location:</strong>{' '}
                        {formatLiveLocationLabel(getProfessionalLocation(booking.professionalId)) || 'Updating live from the professional device'}
                      </p>
                      <div className="booking-map-frame">
                        <iframe
                          title={`Live map for ${booking?.serviceId?.name || 'booking'}`}
                          src={buildMapEmbedUrl(
                            getProfessionalLocation(booking.professionalId).latitude,
                            getProfessionalLocation(booking.professionalId).longitude
                          )}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </>
                  )}
                  {['confirmed', 'in-progress'].includes(String(booking.status || '')) && !getProfessionalLocation(booking.professionalId) && (
                    <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9', marginTop: '12px' }}>
                      <p style={{ margin: 0, color: '#1976d2' }}>
                        📍 Professional location tracking will be available once the professional comes online.
                      </p>
                    </div>
                  )}
                  {booking.cancelReason && (
                    <div style={{ marginTop: 16 }}>
                      <h4>Cancellation Reason</h4>
                      <p>{booking.cancelReason}</p>
                    </div>
                  )}
                </div>
                <div className="booking-status">
                  <span className={`status-badge ${booking.status}`}>
                    {String(booking.status || 'pending').replace('-', ' ')}
                  </span>
                  <div className="booking-actions">
                    {['confirmed', 'in-progress'].includes(String(booking.status || '')) && (
                      <button
                        type="button"
                        className="btn-reschedule"
                        onClick={() => handleBookingAudioCall(booking._id)}
                        disabled={isCallBusy || callingBookingId === booking._id}
                      >
                        {callingBookingId === booking._id ? 'Connecting Call...' : 'Audio Call'}
                      </button>
                    )}
                    <button type="button" className="btn-reschedule" onClick={() => handleRebook(booking)}>
                      Rebook
                    </button>
                    {String(booking.status || '') === 'completed' && (
                      <>
                        <button type="button" className="btn-reschedule" onClick={() => handleDownloadBookingPdf(booking)}>
                          Download PDF
                        </button>
                        <button type="button" className="btn-reschedule" onClick={() => handleDownloadBookingCsv(booking)}>
                          Download CSV
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => openCancelDialog(booking)}
                      disabled={booking.status === 'cancelled'}
                    >
                      {booking.status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                    </button>
                  </div>
                  {booking.status === 'in-progress' && booking.completionOtpIssuedAt && (
                    <p style={{ marginTop: 8 }}>
                      <strong>Action:</strong> Share final OTP with the professional. Professional will verify and complete the booking.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Bookings;
