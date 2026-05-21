import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { professionalService, serviceService } from '../api/services';
import { getSocket } from '../api/socket';
import API_BASE_URL from '../config/apiConfig';
import './Professionals.css';

const THUMBNAIL_PALETTES = [
  ['#1f7aa8', '#49b7cb'],
  ['#8356c8', '#b58bf2'],
  ['#0e8f68', '#67cd9f'],
  ['#b25522', '#f29f66'],
  ['#2b5fb8', '#7aa7f4'],
];

const CITY_ALIASES = {
  lucknow: ['lucknow', 'लखनऊ'],
  delhi: ['delhi', 'नई दिल्ली', 'दिल्ली'],
  mumbai: ['mumbai', 'मुंबई', 'बम्बई'],
  kolkata: ['kolkata', 'कोलकाता', 'कलकत्ता'],
  bengaluru: ['bengaluru', 'bangalore', 'बेंगलुरु', 'बैंगलोर'],
  hyderabad: ['hyderabad', 'हैदराबाद'],
  chennai: ['chennai', 'चेन्नई', 'मद्रास'],
  pune: ['pune', 'पुणे'],
  jaipur: ['jaipur', 'जयपुर'],
  kanpur: ['kanpur', 'कानपुर'],
  patna: ['patna', 'पटना'],
  varanasi: ['varanasi', 'वाराणसी', 'banaras', 'बनारस'],
};

const normalizeCityName = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  for (const [normalized, variants] of Object.entries(CITY_ALIASES)) {
    if (variants.some((variant) => raw.includes(String(variant).toLowerCase()))) {
      return normalized;
    }
  }

  return raw;
};

const getProfessionalLocationCandidates = (professional) => {
  const candidates = [
    professional?.currentCity,
    professional?.location,
    professional?.userId?.city,
    professional?.userId?.address,
    professional?.userId?.profileCity,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set(candidates)];
};

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

const FALLBACK_PROFESSIONALS = [
  {
    id: 'p1',
    name: 'Priya Sharma',
    specialization: 'Hair Stylist',
    skills: ['Hair Stylist', 'Hair Spa', 'Keratin'],
    rating: 4.9,
    reviews: 234,
    availabilityText: '3 slots left today',
    location: 'Lucknow',
    experienceYears: 5,
    completedBookings: 520,
    startingPrice: 699,
    responseTime: 'Responds in 12 mins',
    badge: 'Top Rated',
    bio: 'Precision cuts, styling and bridal-ready finish for all hair types.',
    serviceTags: ['hair', 'stylist', 'spa', 'keratin'],
  },
  {
    id: 'p2',
    name: 'Anjali Verma',
    specialization: 'Beauty Therapist',
    skills: ['Beauty Therapist', 'Waxing', 'Facials'],
    rating: 4.8,
    reviews: 167,
    availabilityText: 'Available tomorrow',
    location: 'Lucknow',
    experienceYears: 7,
    completedBookings: 710,
    startingPrice: 549,
    responseTime: 'Responds in 20 mins',
    badge: 'Most Booked',
    bio: 'Premium skincare rituals and event-ready beauty treatments at home.',
    serviceTags: ['facial', 'beauty', 'waxing'],
  },
  {
    id: 'p3',
    name: 'Neha Mishra',
    specialization: 'Spa Therapist',
    skills: ['Spa Therapist', 'Body Massage', 'Relaxation Therapy'],
    rating: 4.7,
    reviews: 145,
    availabilityText: '2 slots left today',
    location: 'Lucknow',
    experienceYears: 4,
    completedBookings: 430,
    startingPrice: 899,
    responseTime: 'Responds in 15 mins',
    badge: 'Premium',
    bio: 'Deep tissue and stress-relief massage sessions tailored to your needs.',
    serviceTags: ['spa', 'massage', 'therapy'],
  },
  {
    id: 'p4',
    name: 'Ritika Singh',
    specialization: 'Makeup Artist',
    skills: ['Makeup Artist', 'Bridal Makeup', 'Party Makeup'],
    rating: 4.9,
    reviews: 189,
    availabilityText: 'Available in 2 days',
    location: 'Lucknow',
    experienceYears: 6,
    completedBookings: 610,
    startingPrice: 1499,
    responseTime: 'Responds in 10 mins',
    badge: 'Bridal Expert',
    bio: 'Camera-ready premium looks for bridal, festive and occasion makeup.',
    serviceTags: ['makeup', 'bridal', 'party'],
  },
];

const priceRanges = {
  all: [0, Number.POSITIVE_INFINITY],
  budget: [0, 700],
  standard: [701, 1200],
  premium: [1201, Number.POSITIVE_INFINITY],
};

const SERVICE_INTENT_KEYWORDS = {
  "women's salon & spa": ['hair', 'beauty', 'spa', 'makeup', 'waxing', 'facial'],
  'womens salon & spa': ['hair', 'beauty', 'spa', 'makeup', 'waxing', 'facial'],
  'women-salon': ['hair', 'beauty', 'spa', 'makeup', 'waxing', 'facial'],
  'salon for women': ['hair', 'beauty', 'spa', 'makeup', 'waxing', 'facial'],
  'spa services': ['spa', 'massage', 'therapy', 'relaxation'],
  'spa-services': ['spa', 'massage', 'therapy', 'relaxation'],
  'hair services': ['hair', 'stylist', 'cut', 'trim', 'keratin'],
  'hair-services': ['hair', 'stylist', 'cut', 'trim', 'keratin'],
  makeup: ['makeup', 'bridal', 'party', 'styling'],
  'home cleaning': ['cleaning', 'bathroom', 'kitchen', 'mopping', 'dusting'],
  'home-cleaning': ['cleaning', 'bathroom', 'kitchen', 'mopping', 'dusting'],
  'cleaning essentials': ['cleaning', 'bathroom', 'kitchen', 'mopping', 'dusting'],
  "men's grooming": ['grooming', 'hair', 'beard', 'shave', 'massage'],
  'men grooming': ['grooming', 'hair', 'beard', 'shave', 'massage'],
  'men-grooming': ['grooming', 'hair', 'beard', 'shave', 'massage'],
  'grooming for men': ['grooming', 'hair', 'beard', 'shave', 'massage'],
  'cleaning-essentials': ['cleaning', 'bathroom', 'kitchen', 'mopping', 'dusting'],
  'grooming-for-men': ['grooming', 'hair', 'beard', 'shave', 'massage'],
  'salon-for-women': ['hair', 'beauty', 'spa', 'makeup', 'waxing', 'facial'],
};

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

const tokenizeSearchText = (value) =>
  normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

const getKeywordsForQuery = (params) => {
  const values = [params.get('focus'), params.get('service'), params.get('category'), params.get('q')]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const keywords = values.flatMap((value) => {
    const normalized = normalizeSearchText(value);
    return SERVICE_INTENT_KEYWORDS[normalized] || tokenizeSearchText(value);
  });

  return [...new Set(keywords.filter(Boolean))];
};

const getProfessionalId = (bookingProfessional) => {
  if (!bookingProfessional) return null;
  if (typeof bookingProfessional === 'string') return bookingProfessional;
  return bookingProfessional?._id || null;
};

const formatRatingSummary = (ratingValue, reviewsCount) => {
  const safeRating = Number(ratingValue) || 0;
  const safeReviews = Number(reviewsCount) || 0;
  const reviewLabel = safeReviews === 1 ? 'review' : 'reviews';
  return `${safeRating.toFixed(1)} (${safeReviews.toLocaleString()} ${reviewLabel})`;
};


const getKeywordTokens = (bookings) => {
  const stopWords = new Set(['and', 'for', 'with', 'the', 'to', 'at', 'home', 'service']);
  const words = bookings
    .map((booking) => booking?.serviceId?.name || '')
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word));
  return new Set(words);
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

  const serviceTags = skills
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const categories = Array.isArray(professional?.categories)
    ? professional.categories
    : professional?.category ? [professional.category] : [];
  const subCategories = Array.isArray(professional?.subCategories)
    ? professional.subCategories
    : professional?.subCategory ? [professional.subCategory] : [];
  const subSubCategories = Array.isArray(professional?.subSubCategories)
    ? professional.subSubCategories
    : professional?.subSubCategory ? [professional.subSubCategory] : [];
  const serviceTypes = Array.isArray(professional?.serviceTypes)
    ? professional.serviceTypes
    : professional?.serviceType ? [professional.serviceType] : [];

  return {
    id: professional?._id || `fallback-${index}`,
    userId: professional?.userId?._id || '',
    name,
    specialization: skills[0],
    skills,
    categories,
    subCategories,
    subSubCategories,
    serviceTypes,
    rating,
    reviews: reviewsCount,
    availabilityText: buildAvailabilityText(professional?.availability),
    location: getProfessionalLocationCandidates(professional)[0] || 'Lucknow',
    locationCandidates: getProfessionalLocationCandidates(professional),
    experienceYears,
    completedBookings: professional?.completedBookings || reviewsCount * 2,
    startingPrice: servicePrices.length ? Math.min(...servicePrices) : 499,
    responseTime: `Responds in ${10 + (index % 3) * 5} mins`,
    badge: rating >= 4.8 ? 'Top Rated' : experienceYears >= 6 ? 'Senior Pro' : 'Verified',
    bio: professional?.bio || 'Trusted professional delivering premium at-home service quality.',
    isOnline: Boolean(professional?.isOnline),
    serviceTags,
    thumbnail:
      professional?.userId?.profileImage ||
      createProfessionalThumbnail(name, skills[0], index),
  };
};

function Professionals() {
  const navigate = useNavigate();
  const location = useLocation();
  const [allProfessionals, setAllProfessionals] = useState(FALLBACK_PROFESSIONALS);
  const [professionals, setProfessionals] = useState(FALLBACK_PROFESSIONALS);
  const [detectedCity, setDetectedCity] = useState('');
  const [locating, setLocating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [minRating, setMinRating] = useState('all');
  const [bookingHistory, setBookingHistory] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});
  const [serviceIntentKeywords, setServiceIntentKeywords] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryText = String(params.get('service') || params.get('q') || params.get('focus') || '').trim();
    const specialization = String(params.get('specialization') || '').trim();

    setSearchTerm(queryText);
    setSelectedSpecialization(specialization || 'all');
    setServiceIntentKeywords(getKeywordsForQuery(params));
  }, [location.search]);

  const loadProfessionals = useCallback(async () => {
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

      const servicePriceMap = new Map(
        apiServices.map((service) => [String(service?._id), Number(service?.basePrice) || 0])
      );

      if (!apiProfessionals.length) {
        setAllProfessionals(FALLBACK_PROFESSIONALS);
        return;
      }

      setAllProfessionals(apiProfessionals.map((item, index) => normalizeProfessional(item, servicePriceMap, index)));
    } catch (fetchError) {
      console.error('Failed to fetch professionals:', fetchError);
      setError('Showing curated experts while we reconnect to live inventory.');
      setAllProfessionals(FALLBACK_PROFESSIONALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const detectCity = async () => {
      if (!navigator.geolocation) {
        setError('Location is required to show nearby professionals.');
        setLocating(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&lat=${latitude}&lon=${longitude}`,
              {
                headers: {
                  Accept: 'application/json',
                  'Accept-Language': 'en',
                },
              }
            );

            if (!response.ok) {
              throw new Error('Failed to detect your location');
            }

            const data = await response.json();
            const cityFromGeo =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              data?.address?.county ||
              '';

            if (!cityFromGeo) {
              setError('Could not detect city from current location.');
            }

            setDetectedCity(cityFromGeo);
          } catch (locationError) {
            setError(locationError.message || 'Unable to detect location');
          } finally {
            setLocating(false);
          }
        },
        () => {
          setError('Please allow location permission to view nearby professionals.');
          setLocating(false);
        }
      );
    };

    detectCity();
  }, []);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  useEffect(() => {
    if (detectedCity && allProfessionals.length > 0) {
      const normalizedDetectedCity = normalizeCityName(detectedCity);
      const filtered = allProfessionals.filter((pro) => {
        const proCities = getProfessionalLocationCandidates(pro);
        return proCities.some((city) => normalizeCityName(city) === normalizedDetectedCity);
      });
      setProfessionals(filtered.length > 0 ? filtered : allProfessionals); // fallback to all if none in city
    } else {
      setProfessionals(allProfessionals);
    }
  }, [detectedCity, allProfessionals]);

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
    const socket = getSocket(token);

    const handlePresence = ({ userId, isOnline }) => {
      if (!userId) return;
      setOnlineMap((prev) => ({
        ...prev,
        [String(userId)]: Boolean(isOnline),
      }));
    };

    const handleAvailabilityRefresh = () => {
      loadProfessionals();
    };

    socket.on('professional-presence-changed', handlePresence);
    socket.on('professionals-availability-updated', handleAvailabilityRefresh);

    return () => {
      socket.off('professional-presence-changed', handlePresence);
      socket.off('professionals-availability-updated', handleAvailabilityRefresh);
    };
  }, [loadProfessionals]);

  useEffect(() => {
    if (!professionals.length) return;

    setProfessionals((prev) =>
      prev.map((professional) => ({
        ...professional,
        isOnline:
          onlineMap[String(professional.userId)] ??
          onlineMap[String(professional.id)] ??
          professional.isOnline,
      }))
    );
  }, [onlineMap, professionals.length]);

  useEffect(() => {
    const fetchBookingHistory = async () => {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      if (!token) {
        setBookingHistory([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          setBookingHistory([]);
          return;
        }

        const bookings = await response.json();
        setBookingHistory(Array.isArray(bookings) ? bookings : []);
      } catch (historyError) {
        console.error('Failed to fetch booking history:', historyError);
        setBookingHistory([]);
      }
    };

    fetchBookingHistory();
  }, []);

  // Scroll to professionals section when page loads
  useEffect(() => {
    if (!loading && professionals.length > 0) {
      setTimeout(() => {
        const professionalsSection = document.getElementById('professionals-grid-section');
        if (professionalsSection) {
          professionalsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [loading, professionals.length]);

  const specializationOptions = useMemo(() => {
    const allSpecializations = professionals
      .flatMap((professional) => professional.skills || [professional.specialization])
      .filter(Boolean);
    return ['all', ...new Set(allSpecializations)];
  }, [professionals]);

  const featuredStats = useMemo(() => {
    const avgRating = professionals.length
      ? (professionals.reduce((sum, professional) => sum + professional.rating, 0) / professionals.length).toFixed(1)
      : '0.0';

    return {
      totalPros: professionals.length,
      avgRating,
      totalBookings: professionals.reduce((sum, professional) => sum + professional.completedBookings, 0),
    };
  }, [professionals]);

  const personalizationContext = useMemo(() => {
    if (!bookingHistory.length) {
      return {
        keywordTokens: new Set(),
        avgPrice: 0,
        bookedProfessionalIds: new Set(),
      };
    }

    const prices = bookingHistory
      .map((booking) => Number(booking?.price) || 0)
      .filter((price) => price > 0);

    const bookedProfessionalIds = new Set(
      bookingHistory
        .map((booking) => getProfessionalId(booking?.professionalId))
        .filter(Boolean)
        .map(String)
    );

    return {
      keywordTokens: getKeywordTokens(bookingHistory),
      avgPrice: prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0,
      bookedProfessionalIds,
    };
  }, [bookingHistory]);

  const filteredProfessionals = useMemo(() => {
    const [minPrice, maxPrice] = priceRanges[selectedPriceRange] || priceRanges.all;
    const normalizedRating = minRating === 'all' ? 0 : Number(minRating);
    const searchTokens = tokenizeSearchText(searchTerm);

    const filtered = professionals.filter((professional) => {
      const searchableText = [professional.name, professional.specialization, ...(professional.skills || [])]
        .map((value) => String(value || '').toLowerCase());

      const searchMatch =
        !searchTokens.length ||
        searchTokens.some((token) => searchableText.some((field) => field.includes(token)));

      const intentMatch =
        !serviceIntentKeywords.length ||
        serviceIntentKeywords.some((token) => searchableText.some((field) => field.includes(token)));

      const specializationMatch =
        selectedSpecialization === 'all' ||
        (professional.skills || []).includes(selectedSpecialization) ||
        professional.specialization === selectedSpecialization;

      const priceMatch = professional.startingPrice >= minPrice && professional.startingPrice <= maxPrice;
      const ratingMatch = professional.rating >= normalizedRating;
      const normalizedDetectedCity = normalizeCityName(detectedCity);
      const professionalCities = (professional.locationCandidates || [professional.location])
        .map((city) => normalizeCityName(city))
        .filter(Boolean);
      const locationMatch =
        !normalizedDetectedCity ||
        professionalCities.some(
          (city) => city.includes(normalizedDetectedCity) || normalizedDetectedCity.includes(city)
        );

      return searchMatch && intentMatch && specializationMatch && priceMatch && ratingMatch && locationMatch;
    });

    // Check if we have available (online) professionals in the detected city
    const availableProfessionals = filtered.filter((p) => p.isOnline);
    
    // If no available professionals in detected city, show all from that city with "Busy Another Work" badge
    const displayProfessionals = availableProfessionals.length > 0 ? availableProfessionals : filtered;

    const withPersonalization = displayProfessionals.map((professional) => {
      const keywordMatchCount = professional.serviceTags.filter((tag) => personalizationContext.keywordTokens.has(tag)).length;
      const bookedBeforeBoost = personalizationContext.bookedProfessionalIds.has(String(professional.id)) ? 3 : 0;
      const priceAffinity = personalizationContext.avgPrice
        ? Math.max(0, 1 - Math.abs(professional.startingPrice - personalizationContext.avgPrice) / 1200)
        : 0;
      const recommendationScore = keywordMatchCount * 1.8 + bookedBeforeBoost + priceAffinity + professional.rating * 0.25;
      const isBusyAnotherWork = availableProfessionals.length > 0 ? false : !professional.isOnline;

      return {
        ...professional,
        recommendationScore,
        isBusyAnotherWork,
      };
    });

    return withPersonalization.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'priceLowToHigh') return a.startingPrice - b.startingPrice;
      if (sortBy === 'priceHighToLow') return b.startingPrice - a.startingPrice;
      if (sortBy === 'experience') return b.experienceYears - a.experienceYears;

      const aScore = a.recommendationScore + a.rating * 20 + a.completedBookings * 0.03 + (5 - a.startingPrice / 1000);
      const bScore = b.recommendationScore + b.rating * 20 + b.completedBookings * 0.03 + (5 - b.startingPrice / 1000);
      return bScore - aScore;
    });
  }, [
    professionals,
    searchTerm,
    serviceIntentKeywords,
    selectedSpecialization,
    selectedPriceRange,
    minRating,
    sortBy,
    personalizationContext,
    detectedCity,
 ]);

  const recommendedProfessionals = useMemo(() => {
    if (!bookingHistory.length) return [];
    return [...filteredProfessionals]
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 3);
  }, [bookingHistory.length, filteredProfessionals]);

  const handleCardClick = (professional) => {
    navigate(`/professionals/${professional.id}${location.search || ''}`, {
      state: { professional },
    });
  };

  return (
    <div className="professionals-page">
      <section className="professionals-hero">
        <div className="professionals-hero-content">
          <p className="hero-badge">Trusted Home Services Marketplace</p>
          <h1>Book Top Professionals Near You</h1>
          <p>
            Compare ratings, pricing and availability just like an e-commerce catalog. Find your expert,
            view details instantly and book in a few clicks.
          </p>

          <div className="hero-search">
            <input
              type="text"
              placeholder="Search by professional, service, or skill"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" onClick={() => setSearchTerm('')}>
              Clear
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>{featuredStats.totalPros}+</strong>
              <span>Verified Pros</span>
            </div>
            <div>
              <strong>{featuredStats.avgRating}</strong>
              <span>Average Rating</span>
            </div>
            <div>
              <strong>{featuredStats.totalBookings}+</strong>
              <span>Completed Jobs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="professionals-toolbar">
        <div className="specialization-filters">
          {specializationOptions.map((specialization) => (
            <button
              key={specialization}
              type="button"
              className={selectedSpecialization === specialization ? 'active' : ''}
              onClick={() => setSelectedSpecialization(specialization)}
            >
              {specialization === 'all' ? 'All Categories' : specialization}
            </button>
          ))}
        </div>

        <div className="sort-filter-controls">
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recommended">Sort: Recommended</option>
            <option value="rating">Sort: Highest Rating</option>
            <option value="experience">Sort: Most Experienced</option>
            <option value="priceLowToHigh">Sort: Price Low to High</option>
            <option value="priceHighToLow">Sort: Price High to Low</option>
          </select>

          <select value={selectedPriceRange} onChange={(event) => setSelectedPriceRange(event.target.value)}>
            <option value="all">All Price Ranges</option>
            <option value="budget">Budget (up to INR 700)</option>
            <option value="standard">Standard (INR 701 - 1200)</option>
            <option value="premium">Premium (above INR 1200)</option>
          </select>

          <select value={minRating} onChange={(event) => setMinRating(event.target.value)}>
            <option value="all">All Ratings</option>
            <option value="4.8">4.8 and above</option>
            <option value="4.5">4.5 and above</option>
            <option value="4">4.0 and above</option>
          </select>
        </div>
      </section>

      {!!recommendedProfessionals.length && (
        <section className="recommendation-strip">
          <div className="recommendation-title-row">
            <h2>Recommended for you</h2>
            <p>Personalized from your previous bookings</p>
          </div>
          <div className="recommendation-cards">
            {recommendedProfessionals.map((professional) => (
              <button
                key={`rec-${professional.id}`}
                type="button"
                className="recommendation-card"
                onClick={() => handleCardClick(professional)}
              >
                <div>
                  <strong>{professional.name}</strong>
                  <span>{professional.specialization}</span>
                </div>
                <p>⭐ {professional.rating.toFixed(1)} | INR {professional.startingPrice}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <p className="professionals-message warning">{error}</p>}
      {locating && <p className="professionals-message">Detecting your current location...</p>}
      {!locating && detectedCity && (
        <p className="professionals-message">Showing professionals near {detectedCity}</p>
      )}
      {!locating && !detectedCity && (
        <p className="professionals-message">Location unavailable. Showing online professionals.</p>
      )}
      {loading && <p className="professionals-message">Loading professionals...</p>}

      {!loading && (
        <section className="professionals-grid" id="professionals-grid-section">
          {filteredProfessionals.length ? (
            filteredProfessionals.map((professional, index) => {
              const weeklyBookings = Math.max(4, Math.round(professional.completedBookings / 40));
              const trustScore = Math.min(99, Math.round((professional.rating / 5) * 100));
              return (
                <article
                  key={professional.id}
                  className="professional-card"
                  style={{ '--card-stagger': `${Math.min(index, 9) * 70}ms` }}
                  onClick={() => handleCardClick(professional)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleCardClick(professional);
                    }
                  }}
                >
                  <div className="market-media">
                    <img
                      src={professional.thumbnail || createProfessionalThumbnail(professional.name, professional.specialization, index)}
                      alt={`${professional.name} preview`}
                      className="market-image"
                    />
                    <div className="market-shade" />
                    <div className="market-meta-bar">
                        <span>UC Assured · ProRank {trustScore}</span>
                          <span>{weeklyBookings}+ bookings this month</span>
                    </div>
                  </div>

                  <div className="market-content">
                    <div className="market-top-row">
                      <div>
                        <h3>{professional.name}</h3>
                        <p>{professional.specialization}</p>
                      </div>
                      {professional.isBusyAnotherWork ? (
                        <span className="busy-badge">Busy Another Work</span>
                      ) : (
                        <span className="online-badge">Online</span>
                      )}
                    </div>

                    <div className="professional-meta">
                      <span>Experience: {professional.experienceYears}+ years</span>
                      <span>Rating: {formatRatingSummary(professional.rating, professional.reviews)}</span>
                      <span>Price: INR {professional.startingPrice}</span>
                    </div>

                    <button
                      type="button"
                      className="card-bottom-cta"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCardClick(professional);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              <h3>No matching professionals found</h3>
              <p>Try changing filters or searching with another service keyword.</p>
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export default Professionals;
