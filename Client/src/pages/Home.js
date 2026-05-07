import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import HeroCarousel from '../components/HeroCarousel';
import API_BASE_URL from '../config/apiConfig';

const PROFESSIONAL_FOCUS_KEYWORDS = {
  "women's salon & spa": 'women-salon',
  'womens salon & spa': 'women-salon',
  "men's grooming": 'men-grooming',
  'men grooming': 'men-grooming',
  'spa services': 'spa-services',
  'hair services': 'hair-services',
  makeup: 'makeup',
  'home cleaning': 'home-cleaning',
  'salon for women': 'salon-for-women',
  'cleaning essentials': 'cleaning-essentials',
  'grooming for men': 'grooming-for-men',
};

const buildProfessionalsPath = (params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });

  const search = searchParams.toString();
  return search ? `/professionals?${search}` : '/professionals';
};

function Home() {
  const navigate = useNavigate();
  const [mostBookedServices, setMostBookedServices] = useState([]);
  const [homepageSections, setHomepageSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const categoriesShellRef = useRef(null);
  const categoriesTrackRef = useRef(null);
  const salonShellRef = useRef(null);
  const salonTrackRef = useRef(null);
  useEffect(() => {
    fetchMostBookedServices();
    fetchHomepageCards();
  }, []);

  async function fetchMostBookedServices() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/services/most-booked`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        setMostBookedServices([]);
        return;
      }

      const services = await response.json();
      const formattedServices = (Array.isArray(services) ? services : [])
        .map(service => ({
          id: service._id,
          name: service.name,
          price: service.basePrice,
          rating: service.rating || 0,
          reviews: service.reviewCount || 0,
          time: `${service.estimatedDuration} mins`,
          image: service.image || null,
          discount: null
        }))
        .slice(0, 6);

      setMostBookedServices(formattedServices);
    } catch (err) {
      console.error('Error fetching most booked services:', err);
      setMostBookedServices([]);
    } finally {
      setLoading(false);
    }
  }

  const fetchHomepageCards = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/homepage-cards`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setHomepageSections(data.sections || null);
    } catch (err) {
      console.error('Error fetching homepage cards:', err);
    }
  };

  const quickCategories = [
    { id: 1, name: "Women's Salon & Spa", image: '/WSS.png', time: '45 mins' },
    { id: 2, name: "Men's Grooming", image: '/MG.png', time: '30 mins' },
    { id: 3, name: 'Spa Services', image: '/SS.png', time: '60 mins' },
    { id: 4, name: 'Hair Services', image: '/HS.png', time: '45 mins' },
    { id: 5, name: 'Makeup', image: '/M.png', time: '50 mins' },
    { id: 6, name: 'Home Cleaning', image: '/C.png', time: '90 mins' },
  ];

  const categoryServices = [
    {
      title: 'Salon for Women',
      subtitle: 'Signature beauty sessions with trained experts',
      icon: 'WSS.png',
      services: ['Waxing', 'Threading', 'Facial', 'Cleanup', 'Makeup'],
    },
    {
      title: 'Cleaning Essentials',
      subtitle: 'Deep cleaning routines for every corner',
      icon: 'C.png',
      services: ['Home Cleaning', 'Carpet Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning'],
    },
    {
      title: 'Grooming for Men',
      subtitle: 'Contemporary grooming with premium products',
      icon: 'MG.png',
      services: ['Haircut', 'Shave', 'Beard Trim', 'Massage'],
    },
  ];

  const dynamicQuickCategories = homepageSections?.['explore-popular-categories']?.length
    ? homepageSections['explore-popular-categories'].map((card, index) => ({
        id: card._id || index,
        name: card.title,
        image: card.image || '/WSS.png',
        time: card.time || '45 mins',
      }))
    : quickCategories;

  const dynamicCategoryServices = [
    {
      title: 'Salon for Women',
      subtitle: 'Signature beauty sessions with trained experts',
      icon: 'WSS.png',
      services: homepageSections?.['salon-for-women']?.length
        ? homepageSections['salon-for-women'].map((card) => ({
            id: card._id,
            name: card.title,
            image: card.image || '/WSS.png',
          }))
        : categoryServices.find((item) => item.title === 'Salon for Women')?.services || [],
    },
    {
      title: 'Cleaning Essentials',
      subtitle: 'Deep cleaning routines for every corner',
      icon: 'C.png',
      services: homepageSections?.['cleaning-essentials']?.length
        ? homepageSections['cleaning-essentials'].map((card) => ({
            id: card._id,
            name: card.title,
            image: card.image || '/C.png',
          }))
        : categoryServices.find((item) => item.title === 'Cleaning Essentials')?.services || [],
    },
    {
      title: 'Grooming for Men',
      subtitle: 'Contemporary grooming with premium products',
      icon: 'MG.png',
      services: homepageSections?.['grooming-for-men']?.length
        ? homepageSections['grooming-for-men'].map((card) => ({
            id: card._id,
            name: card.title,
            image: card.image || '/MG.png',
          }))
        : categoryServices.find((item) => item.title === 'Grooming for Men')?.services || [],
    },
  ];

  const platformHighlights = [
    { id: 1, value: '10K+', label: 'Monthly Appointments' },
    { id: 2, value: '4.8★', label: 'Average Customer Rating' },
    { id: 3, value: '60 Min', label: 'Average Arrival Time' },
    { id: 4, value: '100%', label: 'Verified Professionals' },
  ];

  const trustPillars = [
    {
      title: 'Vetted Experts',
      description: 'Every professional is identity-verified and skill-tested before going live.',
    },
    {
      title: 'Transparent Pricing',
      description: 'No hidden charges, with clear service pricing shown before booking.',
    },
    {
      title: 'On-Time Support',
      description: 'Real-time support and updates from booking to service completion.',
    },
  ];

  const goToProfessionals = (params) => {
    navigate(buildProfessionalsPath(params));
  };

  const scrollShell = (shellRef, trackRef, distance) => {
    if (!shellRef?.current) return;

    const shellElement = shellRef.current;
    const trackElement = trackRef?.current;

    if (trackElement?.classList.contains('auto-scroll-ltr')) {
      trackElement.classList.add('paused');
      setTimeout(() => trackElement.classList.remove('paused'), 2600);
    }

    shellElement.scrollBy({ left: distance, behavior: 'smooth' });
  };

  return (
    <div className="home">
      <HeroCarousel />

      <section className="home-intro">
        <div className="container">
          <div className="intro-card">
            <p className="intro-eyebrow">KLPro Home Services</p>
            <h1>Professional Home Services, Curated for Modern Living</h1>
            <p>
              Browse expert-led beauty, grooming, spa, and cleaning services with fast scheduling
              and consistent quality standards.
            </p>
            <div className="intro-cta-row">
              <a href="/services" className="intro-btn primary">Browse All Services</a>
              <a href="/professionals" className="intro-btn secondary">Meet Professionals</a>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-categories">
        <div className="container">
          <div className="section-header-block">
            <h2>Explore Popular Categories</h2>
            <p>Find the right service in seconds and book at your convenience.</p>
          </div>
          <div className="categories-carousel-shell">
            <div className="carousel-nav-holder">
              <button
                aria-label="Scroll categories left"
                className="carousel-nav left"
                onClick={() => scrollShell(categoriesShellRef, categoriesTrackRef, -320)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Scroll categories right"
                className="carousel-nav right"
                onClick={() => scrollShell(categoriesShellRef, categoriesTrackRef, 320)}
                type="button"
              >
                ›
              </button>
            </div>
            <div ref={categoriesShellRef} className="categories-scroll-shell">
              <div ref={categoriesTrackRef} className="categories-track auto-scroll-ltr">
              {[...dynamicQuickCategories, ...dynamicQuickCategories].map((cat, idx) => (
                <div key={`${cat.id}-${idx}`} className="quick-card" aria-hidden={idx >= dynamicQuickCategories.length}>
                  <div className="quick-image">
                    <img src={cat.image} alt={cat.name} />
                  </div>
                  <h3>{cat.name}</h3>
                  <p className="quick-time">⏱️ {cat.time}</p>
                  <button
                    className="quick-btn"
                    type="button"
                    onClick={() =>
                      goToProfessionals({
                        focus: PROFESSIONAL_FOCUS_KEYWORDS[String(cat.name || '').toLowerCase()] || String(cat.name || ''),
                      })
                    }
                  >
                    Book
                  </button>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {platformHighlights.map((item) => (
              <div key={item.id} className="stat-card">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="offers-section">
        <div className="container">
          <div className="section-header-block">
            <h2>Exclusive Booking Benefits</h2>
            <p>Make every booking more rewarding with limited-time offers.</p>
          </div>
          <div className="offers-carousel">
            <div className="offer-banner">
              <span className="offer-badge">New User</span>
              <h3>Save 20% on first booking</h3>
              <p>Use code: KL20</p>
            </div>
            <div className="offer-banner">
              <span className="offer-badge">Referral</span>
              <h3>Refer & Earn Rewards</h3>
              <p>Get ₹200 for each referral</p>
            </div>
            <div className="offer-banner">
              <span className="offer-badge">Weekend</span>
              <h3>Weekend Special</h3>
              <p>Flat 30% off on services</p>
            </div>
          </div>
        </div>
      </section>

      <section className="most-booked">
        <div className="container">
          <div className="section-header">
            <h2>Most Booked Services</h2>
            <a href="/services" className="see-all">See all →</a>
          </div>
          {loading ? (
            <div className="loading-message" style={{ textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' }}>
              Loading services...
            </div>
          ) : mostBookedServices.length > 0 ? (
            <div className="services-carousel">
              {mostBookedServices.map((service) => (
                <div key={service.id} className="service-carousel-card">
                  {service.discount && (
                    <div className="discount-badge">{service.discount}</div>
                  )}
                  <div className="service-image">
                    {service.image ? (
                      <img src={service.image} alt={service.name} />
                    ) : (
                      <div className="image-placeholder">📷</div>
                    )}
                  </div>
                  <h3>{service.name}</h3>
                  <div className="rating">
                    <span className="stars">⭐ {service.rating.toFixed(1)}</span>
                    <span className="reviews">({service.reviews})</span>
                  </div>
                  <div className="service-details">
                    <span className="time">⏱️ {service.time}</span>
                    <span className="instant">Instant</span>
                  </div>
                  <div className="price-section">
                    <span className="price">₹{service.price}</span>
                    <button
                      className="book-btn"
                      type="button"
                      onClick={() =>
                        goToProfessionals({
                          service: service.name,
                        })
                      }
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-services-message" style={{ textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#999' }}>
              No most booked services available yet. Check back soon!
            </div>
          )}
        </div>
      </section>

      {dynamicCategoryServices.map((category) => (
        <section key={category.title} className="category-section">
          <div className="container">
            <div className="category-header">
              <div>
                <h2>{category.title}</h2>
                <p>{category.subtitle}</p>
              </div>
              <a href="/services" className="see-all">See all →</a>
            </div>
            {category.title === 'Salon for Women' ? (
              <div className="category-services-carousel-shell">
                <div ref={salonShellRef} className="category-services-scroll-shell">
                  <div ref={salonTrackRef} className="category-services-track auto-scroll-ltr">
                  {[...category.services, ...category.services].map((service, idx) => {
                    const serviceName = typeof service === 'string' ? service : service.name;
                    const serviceImage = typeof service === 'string' ? `/${category.icon}` : service.image;
                    const serviceKey = typeof service === 'string' ? `${service}-${idx}` : `${service.id}-${idx}`;
                    return (
                      <div key={serviceKey} className="category-service-card" aria-hidden={idx >= category.services.length}>
                        <div className="service-image-lg">
                          <img src={serviceImage} alt={serviceName} />
                        </div>
                        <h3>{serviceName}</h3>
                        <p>Professional & verified</p>
                        <button
                          className="service-btn"
                          type="button"
                          onClick={() =>
                            goToProfessionals({
                              focus: 'salon-for-women',
                              service: serviceName,
                            })
                          }
                        >
                          Explore
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>
                <div className="carousel-nav-holder category-nav-holder">
                  <button
                    aria-label={`Scroll ${category.title} left`}
                    className="carousel-nav left"
                    onClick={() => scrollShell(salonShellRef, salonTrackRef, -260)}
                    type="button"
                  >
                    ‹
                  </button>
                  <button
                    aria-label={`Scroll ${category.title} right`}
                    className="carousel-nav right"
                    onClick={() => scrollShell(salonShellRef, salonTrackRef, 260)}
                    type="button"
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : (
              <div className="category-services">
                {category.services.map((service, idx) => {
                  const serviceName = typeof service === 'string' ? service : service.name;
                  const serviceImage = typeof service === 'string' ? `/${category.icon}` : service.image;
                  return (
                    <div key={typeof service === 'string' ? `${service}-${idx}` : service.id} className="category-service-card">
                      <div className="service-image-lg">
                        <img src={serviceImage} alt={serviceName} />
                      </div>
                      <h3>{serviceName}</h3>
                      <p>Professional & verified</p>
                      <button
                        className="service-btn"
                        type="button"
                        onClick={() =>
                          goToProfessionals({
                            focus:
                              category.title === 'Cleaning Essentials'
                                ? 'cleaning-essentials'
                                : 'grooming-for-men',
                            service: serviceName,
                          })
                        }
                      >
                        Explore
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}

      <section className="why-us">
        <div className="container">
          <div className="section-header-block">
            <h2>Why KLPro Stands Out</h2>
            <p>Built for reliability, quality delivery, and complete peace of mind.</p>
          </div>
          <div className="why-grid">
            {trustPillars.map((pillar) => (
              <div key={pillar.title} className="why-card">
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to Book a Service?</h2>
            <p>Choose your service, pick a slot, and let our experts handle the rest.</p>
            <a href="/services" className="cta-btn">Start Booking</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
