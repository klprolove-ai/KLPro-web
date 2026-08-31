import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { professionalService, serviceService, getProfessionalReviews } from '../api/services';
import { getSocket } from '../api/socket';
import ReviewForm from '../components/ReviewForm';
import ReviewsList from '../components/ReviewsList';
import API_BASE_URL from '../config/apiConfig';
import { trackStartBooking, trackViewProfessional } from '../utils/analytics';
import './ProfessionalDetails.css';

const THUMBNAIL_PALETTES = [
  ['#1f7aa8', '#49b7cb'],
  ['#8356c8', '#b58bf2'],
  ['#0e8f68', '#67cd9f'],
  ['#b25522', '#f29f66'],
  ['#2b5fb8', '#7aa7f4'],
];

const SLOT_WINDOW_START = 0;
const SLOT_WINDOW_END = 24 * 60 - 30;
const SLOT_INTERVAL_MINUTES = 30;

const FALLBACK_PROFESSIONALS = [
  {
    id: 'p1',
    name: 'Priya Sharma',
    specialization: 'Hair Stylist',
    skills: ['Hair Stylist', 'Hair Spa', 'Keratin'],
    rating: 4.9,
    reviews: 234,
    location: 'Lucknow',
    experienceYears: 5,
    completedBookings: 520,
    startingPrice: 699,
    bio: 'Precision cuts, styling and bridal-ready finish for all hair types.',
  },
  {
    id: 'p2',
    name: 'Anjali Verma',
    specialization: 'Beauty Therapist',
    skills: ['Beauty Therapist', 'Waxing', 'Facials'],
    rating: 4.8,
    reviews: 167,
    location: 'Lucknow',
    experienceYears: 7,
    completedBookings: 710,
    startingPrice: 549,
    bio: 'Premium skincare rituals and event-ready beauty treatments at home.',
  },
  {
    id: 'p3',
    name: 'Neha Mishra',
    specialization: 'Spa Therapist',
    skills: ['Spa Therapist', 'Body Massage', 'Relaxation Therapy'],
    rating: 4.7,
    reviews: 145,
    location: 'Lucknow',
    experienceYears: 4,
    completedBookings: 430,
    startingPrice: 899,
    bio: 'Deep tissue and stress-relief massage sessions tailored to your needs.',
  },
  {
    id: 'p4',
    name: 'Ritika Singh',
    specialization: 'Makeup Artist',
    skills: ['Makeup Artist', 'Bridal Makeup', 'Party Makeup'],
    rating: 4.9,
    reviews: 189,
    location: 'Lucknow',
    experienceYears: 6,
    completedBookings: 610,
    startingPrice: 1499,
    bio: 'Camera-ready premium looks for bridal, festive and occasion makeup.',
  },
];

const getInitials = (name) =>
  String(name || 'Pro')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'PR';

const getSpecializationMark = (specialization) => {
  const normalized = String(specialization || '').toLowerCase();
  if (normalized.includes('hair')) return 'HS';
  if (normalized.includes('beauty')) return 'BT';
  if (normalized.includes('spa')) return 'SP';
  if (normalized.includes('makeup')) return 'MU';
  if (normalized.includes('massage')) return 'MG';
  return 'PRO';
};

const createProfessionalThumbnail = (name, specialization, index = 0) => {
  const [startColor, endColor] = THUMBNAIL_PALETTES[index % THUMBNAIL_PALETTES.length];
  const initials = getInitials(name);
  const mark = getSpecializationMark(specialization);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${startColor}"/><stop offset="100%" stop-color="${endColor}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="120" cy="280" r="120" fill="rgba(255,255,255,0.14)"/><circle cx="540" cy="40" r="100" fill="rgba(255,255,255,0.12)"/><text x="40" y="58" fill="rgba(255,255,255,0.9)" font-size="28" font-family="Arial, sans-serif" font-weight="700">${mark}</text><text x="40" y="322" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const formatDateInput = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeTimeLabel = (minutes) => {
  const hours24 = Math.floor(minutes / 60);
  const minutesPart = String(minutes % 60).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${minutesPart} ${period}`;
};

const normalizeArrayValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const formatRatingSummary = (ratingValue, reviewsCount) => {
  const safeRating = Number(ratingValue) || 0;
  const safeReviews = Number(reviewsCount) || 0;
  const reviewLabel = safeReviews === 1 ? 'review' : 'reviews';
  return `${safeRating.toFixed(1)} (${safeReviews.toLocaleString()} ${reviewLabel})`;
};

const buildAvailabilityText = (availability) => {
  if (!Array.isArray(availability) || !availability.length) {
    return 'Schedule available this week';
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todaySlots = availability.filter((slot) => slot?.day === today);
  if (todaySlots.length > 0) {
    return `${todaySlots.length} slots left today`;
  }

  return `Next slot: ${availability[0]?.day || 'Soon'}`;
};

const normalizeProfessional = (professional, servicePriceMap, index) => {
  const servicePrices = (professional?.services || [])
    .map((item) => {
      if (typeof item?.price === 'number' && item.price > 0) {
        return item.price;
      }
      return servicePriceMap.get(String(item?.serviceId)) || null;
    })
    .filter((price) => typeof price === 'number' && price > 0);

  const reviewsCount = Array.isArray(professional?.reviews)
    ? professional.reviews.length
    : professional?.completedBookings
      ? Math.max(8, Math.floor(professional.completedBookings / 4))
      : 0;

  const experienceYears = Number(professional?.experience) || 1;
  const rating = Number(professional?.rating) || 4.5;
  const name = professional?.userId?.name || `Professional ${index + 1}`;
  const skills = Array.isArray(professional?.specializations) && professional.specializations.length
    ? professional.specializations
    : ['Home Expert'];

  return {
    id: professional?._id || `fallback-${index}`,
    userId: professional?.userId?._id || '',
    name,
    specialization: skills[0],
    skills,
    rating,
    reviews: reviewsCount,
    availabilityText: buildAvailabilityText(professional?.availability),
    location: 'Lucknow',
    experienceYears,
    completedBookings: professional?.completedBookings || reviewsCount * 2,
    startingPrice: servicePrices.length ? Math.min(...servicePrices) : 499,
    bio: professional?.bio || 'Trusted professional delivering premium at-home service quality.',
    isOnline: Boolean(professional?.isOnline),
    thumbnail:
      professional?.userId?.profileImage ||
      createProfessionalThumbnail(name, skills[0], index),
  };
};

const buildLiveSlots = ({ professionalId, selectedDate, nowMs, bookedSlots = [] }) => {
  const slots = [];
  const todayString = formatDateInput(new Date(nowMs));
  const nowMinutes = new Date(nowMs).getHours() * 60 + new Date(nowMs).getMinutes();
  const isToday = selectedDate === todayString;
  const bookedSlotSet = new Set(
    (Array.isArray(bookedSlots) ? bookedSlots : [])
      .map((slot) => String(slot?.scheduledTime || '').trim())
      .filter(Boolean)
  );

  for (let minutes = SLOT_WINDOW_START; minutes <= SLOT_WINDOW_END; minutes += SLOT_INTERVAL_MINUTES) {
    const label = makeTimeLabel(minutes);
    const isBooked = bookedSlotSet.has(label);
    const unavailableBecausePast = isToday && minutes <= nowMinutes + 30;
    const isAvailable = !isBooked && !unavailableBecausePast;

    slots.push({
      label,
      seatsLeft: isBooked ? 0 : 4,
      isAvailable,
      reason: isBooked ? 'Booked' : unavailableBecausePast ? 'Elapsed' : 'Available',
    });
  }

  return slots;
};

function ProfessionalDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const authToken = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
  const isLoggedIn = Boolean(authToken);

  const [professional, setProfessional] = useState(location.state?.professional || null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(!location.state?.professional);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotNotice, setSlotNotice] = useState('');
  const [liveNow, setLiveNow] = useState(Date.now());
  const [bookedSlots, setBookedSlots] = useState([]);

  const [reviews, setReviews] = useState([]);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const lastTrackedProfessionalId = useRef(null);

  const bookingDraft = useMemo(() => {
    try {
      const draft = localStorage.getItem('bookingDraft');
      return draft ? JSON.parse(draft) : null;
    } catch (parseError) {
      console.error('Invalid bookingDraft JSON:', parseError);
      return null;
    }
  }, []);

  const resolvedServiceForBooking = useMemo(() => {
    const searchParams = new URLSearchParams(location.search || '');
    const serviceQuery = String(
      searchParams.get('service') ||
      searchParams.get('q') ||
      searchParams.get('focus') ||
      bookingDraft?.serviceName ||
      ''
    ).trim().toLowerCase();

    const serviceId = String(bookingDraft?.serviceId || '').trim();
    if (serviceId) {
      const directMatch = services.find((service) => String(service?._id) === serviceId);
      if (directMatch) return directMatch;
    }

    if (!serviceQuery) return null;

    return services.find((service) => {
      const haystack = [service?.name, service?.category, service?.subCategory, service?.subSubCategory, service?.serviceType]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(serviceQuery) || serviceQuery.includes(String(service?.name || '').toLowerCase());
    }) || null;
  }, [bookingDraft?.serviceId, bookingDraft?.serviceName, location.search, services]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!professional?.id) {
      setBookedSlots([]);
      return undefined;
    }

    let mounted = true;

    const fetchBookedSlots = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/public/professional/${professional.id}/slots?date=${encodeURIComponent(selectedDate)}`
        );

        if (!response.ok) return;

        const data = await response.json();
        if (!mounted) return;

        setBookedSlots(Array.isArray(data?.bookedSlots) ? data.bookedSlots : []);
      } catch (fetchError) {
        if (mounted) {
          setBookedSlots([]);
        }
      }
    };

    fetchBookedSlots();

    return () => {
      mounted = false;
    };
  }, [professional?.id, selectedDate]);

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
    const socket = getSocket(token);

    const handleBookingAvailabilityChange = (payload) => {
      if (!professional?.id) return;
      if (String(payload?.professionalId || '') !== String(professional.id)) return;
      fetch(`${API_BASE_URL}/bookings/public/professional/${professional.id}/slots?date=${encodeURIComponent(selectedDate)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (Array.isArray(data?.bookedSlots)) {
            setBookedSlots(data.bookedSlots);
          }
        })
        .catch(() => {});
    };

    const handlePresence = ({ userId, isOnline }) => {
      setProfessional((prev) => {
        if (!prev) return prev;
        const matches = String(prev.userId || prev.id) === String(userId);
        if (!matches) return prev;
        return {
          ...prev,
          isOnline: Boolean(isOnline),
        };
      });
    };

    socket.on('booking-status-changed', handleBookingAvailabilityChange);
    socket.on('professionals-availability-updated', handleBookingAvailabilityChange);
    socket.on('professional-presence-changed', handlePresence);

    return () => {
      socket.off('booking-status-changed', handleBookingAvailabilityChange);
      socket.off('professionals-availability-updated', handleBookingAvailabilityChange);
      socket.off('professional-presence-changed', handlePresence);
    };
  }, [professional?.id, selectedDate]);

  useEffect(() => {
    const fetchProfessional = async () => {
      if (professional) return;
      try {
        setLoading(true);
        setError('');

        const [professionalsResponse, servicesResponse] = await Promise.all([
          professionalService.getAll(),
          serviceService.getAll(),
        ]);

        const apiProfessionals = Array.isArray(professionalsResponse?.data)
          ? professionalsResponse.data
          : Array.isArray(professionalsResponse?.data?.professionals)
            ? professionalsResponse.data.professionals
            : [];

        const apiServices = Array.isArray(servicesResponse?.data)
          ? servicesResponse.data
          : Array.isArray(servicesResponse?.data?.services)
            ? servicesResponse.data.services
            : [];

        setServices(apiServices);

        const servicePriceMap = new Map(
          apiServices.map((service) => [String(service?._id), Number(service?.basePrice) || 0])
        );

        const normalized = (apiProfessionals.length ? apiProfessionals : FALLBACK_PROFESSIONALS).map((item, index) =>
          normalizeProfessional(item, servicePriceMap, index)
        );

        const found = normalized.find((pro) => String(pro.id) === String(id));
        if (!found) {
          setError('Professional not found.');
          return;
        }

        setProfessional(found);
      } catch (fetchError) {
        console.error('Failed to load professional details:', fetchError);
        const foundFallback = FALLBACK_PROFESSIONALS.find((pro) => String(pro.id) === String(id));
        if (foundFallback) {
          setProfessional(foundFallback);
        } else {
          setError('Failed to load professional details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfessional();
  }, [id, professional]);

  useEffect(() => {
    if (!professional?.id) return;
    fetchReviews(professional.userId || professional.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professional?.id, professional?.userId, currentReviewPage]);

  useEffect(() => {
    if (!professional?.id || !bookingDraft) return;
    if (String(bookingDraft.professionalId || '') !== String(professional.id)) return;

    if (bookingDraft.scheduledDate) {
      setSelectedDate(bookingDraft.scheduledDate);
    }
    setSelectedSlot(bookingDraft.selectedSlot || bookingDraft.scheduledTime || '');
    setSlotNotice('');
  }, [bookingDraft, professional?.id]);

  const liveSlots = useMemo(() => {
    if (!professional) return [];
    return buildLiveSlots({
      professionalId: professional.id,
      selectedDate,
      nowMs: liveNow,
      bookedSlots,
    });
  }, [professional, selectedDate, liveNow, bookedSlots]);

  const fetchReviews = async (professionalId) => {
    try {
      setReviewsLoading(true);
      const response = await getProfessionalReviews(professionalId, {
        page: currentReviewPage,
        limit: 5,
      });
      const data = response?.data ?? response;
      if (data.success) {
        setReviews(data.reviews || []);
        setTotalReviewPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleContinueBooking = () => {
    if (!professional) return;

    if (!selectedSlot) {
      setSlotNotice('Choose an available slot before continuing.');
      return;
    }

    trackStartBooking({
      serviceId: resolvedServiceForBooking?._id || bookingDraft?.serviceId,
      serviceName: resolvedServiceForBooking?.name || bookingDraft?.serviceName,
      professionalId: professional.id,
    });

    const nextBookingDraft = {
      professionalId: professional.id,
      professionalName: professional.name,
      scheduledDate: selectedDate,
      scheduledTime: selectedSlot,
      serviceId: resolvedServiceForBooking?._id || bookingDraft?.serviceId || '',
      serviceName: resolvedServiceForBooking?.name || bookingDraft?.serviceName || '',
      expectedPrice: resolvedServiceForBooking?.basePrice || professional.startingPrice,
    };

    localStorage.setItem('bookingDraft', JSON.stringify(nextBookingDraft));
    navigate('/bookings');
  };

  useEffect(() => {
    const professionalId = professional?.id;
    if (!professionalId || lastTrackedProfessionalId.current === professionalId) return;

    lastTrackedProfessionalId.current = professionalId;
    trackViewProfessional({ professionalId, professionalName: professional.name });
  }, [professional]);

  if (loading) {
    return <p className="professional-details-message">Loading professional details...</p>;
  }

  if (error || !professional) {
    return (
      <div className="professional-details-message error">
        <p>{error || 'Professional not found.'}</p>
        <button type="button" onClick={() => navigate('/professionals')}>
          Back to Professionals
        </button>
      </div>
    );
  }

  return (
    <div className="professional-details-page">
      <div className="details-top-actions">
        <button type="button" className="ghost" onClick={() => navigate('/professionals')}>
          Back
        </button>
      </div>

      <section className="details-hero">
        <img
          src={professional.thumbnail || createProfessionalThumbnail(professional.name, professional.specialization, 0)}
          alt={`${professional.name} preview`}
        />
        <div>
          <h1>{professional.name}</h1>
          <p>{professional.specialization}</p>
          <p className={`details-online ${professional.isOnline ? 'online' : 'offline'}`}>
            {professional.isOnline ? 'Online now' : 'Offline'}
          </p>
          <span>⭐ {formatRatingSummary(professional.rating, professional.reviews)}</span>
          <p className="details-bio">{professional.bio}</p>
        </div>
      </section>

      <section className="details-grid">
        <div>
          <small>Experience</small>
          <strong>{professional.experienceYears}+ years</strong>
        </div>
        <div>
          <small>Completed Jobs</small>
          <strong>{professional.completedBookings}+</strong>
        </div>
        <div>
          <small>Location</small>
          <strong>{professional.location}</strong>
        </div>
        <div>
          <small>Starting Price</small>
          <strong>INR {professional.startingPrice}</strong>
        </div>
      </section>

      <div className="skills-row details-skills">
        {(professional.skills || []).map((skill) => (
          <span key={`${professional.id}-details-${skill}`}>{skill}</span>
        ))}
      </div>

      {(normalizeArrayValue(professional.categories || professional.category).length > 0 ||
        normalizeArrayValue(professional.subCategories || professional.subCategory).length > 0 ||
        normalizeArrayValue(professional.subSubCategories || professional.subSubCategory).length > 0 ||
        normalizeArrayValue(professional.serviceTypes || professional.serviceType).length > 0) && (
        <section className="details-category-panel">
          {normalizeArrayValue(professional.categories || professional.category).length > 0 && (
            <div className="category-block">
              <small>Categories</small>
              <div className="category-tags">
                {normalizeArrayValue(professional.categories || professional.category).map((item) => (
                  <span key={`category-${item}`}>{item}</span>
                ))}
              </div>
            </div>
          )}
          {normalizeArrayValue(professional.subCategories || professional.subCategory).length > 0 && (
            <div className="category-block">
              <small>Subcategories</small>
              <div className="category-tags">
                {normalizeArrayValue(professional.subCategories || professional.subCategory).map((item) => (
                  <span key={`subcategory-${item}`}>{item}</span>
                ))}
              </div>
            </div>
          )}
          {normalizeArrayValue(professional.subSubCategories || professional.subSubCategory).length > 0 && (
            <div className="category-block">
              <small>Sub-Subcategories</small>
              <div className="category-tags">
                {normalizeArrayValue(professional.subSubCategories || professional.subSubCategory).map((item) => (
                  <span key={`subsubcategory-${item}`}>{item}</span>
                ))}
              </div>
            </div>
          )}
          {normalizeArrayValue(professional.serviceTypes || professional.serviceType).length > 0 && (
            <div className="category-block">
              <small>Next Subcategories</small>
              <div className="category-tags">
                {normalizeArrayValue(professional.serviceTypes || professional.serviceType).map((item) => (
                  <span key={`serviceType-${item}`}>{item}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="details-panel slot-picker">
        <div className="slot-picker-head">
          <h3>Select a slot</h3>
          <small>Live updated at {new Date(liveNow).toLocaleTimeString()}</small>
        </div>
        <div className="slot-date-row">
          <label htmlFor="appointmentDate">Date</label>
          <input
            id="appointmentDate"
            type="date"
            min={formatDateInput(new Date())}
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setSelectedSlot('');
              setSlotNotice('');
            }}
          />
        </div>

        <div className="slot-grid">
          {liveSlots.map((slot) => (
            <button
              key={`${professional.id}-${selectedDate}-${slot.label}`}
              type="button"
              disabled={!slot.isAvailable}
              className={`slot-item ${selectedSlot === slot.label ? 'selected' : ''}`}
              onClick={() => {
                setSelectedSlot(slot.label);
                setSlotNotice('');
              }}
            >
              <span>{slot.label}</span>
              <small>{slot.isAvailable ? `${slot.seatsLeft} left` : slot.reason}</small>
            </button>
          ))}
        </div>

        {slotNotice && <p className="slot-notice">{slotNotice}</p>}

        <div className="slot-actions">
          <button type="button" className="primary" onClick={handleContinueBooking}>
            Continue to Booking
          </button>
        </div>
      </div>

      <div className="reviews-section" style={{ marginTop: '40px' }}>
        <h2>Reviews & Ratings</h2>

        {isLoggedIn ? (
          <ReviewForm
            professionalId={professional.id || id}
            onReviewSubmit={() => {
              setCurrentReviewPage(1);
              fetchReviews(professional.userId || professional.id || id);
            }}
            reviewType="professional"
          />
        ) : (
          <div className="login-prompt">
            <p>Please log in to leave a review</p>
            <button onClick={() => navigate('/login')}>Login</button>
          </div>
        )}

        {reviewsLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Loading reviews...
          </div>
        ) : (
          <ReviewsList
            reviews={reviews}
            currentPage={currentReviewPage}
            totalPages={totalReviewPages}
            onPageChange={setCurrentReviewPage}
          />
        )}
      </div>
    </div>
  );
}

export default ProfessionalDetails;
