import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ServiceDetails.css';
import { getServiceById, getServiceReviews, getServices } from '../api/services';
import ReviewForm from '../components/ReviewForm';
import ReviewsList from '../components/ReviewsList';
import { trackStartBooking, trackViewService } from '../utils/analytics';

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

const renderStars = (rating = 0) => (
  <div className="service-rating-stars">
    {[...Array(5)].map((_, index) => (
      <span key={index} className={index < Math.round(rating) ? 'star filled' : 'star'}>
        ★
      </span>
    ))}
    <span className="rating-value">({Number(rating || 0).toFixed(1)})</span>
  </div>
);

function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const lastTrackedServiceId = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const viewerType = user?.userType || (localStorage.getItem('adminToken') ? 'admin' : 'customer');
  const canViewInternalCharges = viewerType === 'admin' || viewerType === 'professional';

  const unwrapResponse = (response) => response?.data ?? response;

  const fetchService = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getServiceById(id);
      const data = unwrapResponse(response);

      if (data?.success) {
        setService(data.service);
      } else if (data?._id) {
        setService(data);
      }
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRelatedServicesSource = useCallback(async () => {
    try {
      const response = await getServices();
      const data = unwrapResponse(response);
      const items = Array.isArray(data) ? data : data?.services || [];
      setAllServices(items);
    } catch (error) {
      console.error('Error fetching services for related items:', error);
      setAllServices([]);
    }
  }, []);

  const fetchReviews = useCallback(async (page = reviewPage) => {
    try {
      const response = await getServiceReviews(id, { page, limit: 5 });
      const data = unwrapResponse(response);

      if (data?.success) {
        setReviews(data.reviews || []);
        setReviewPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching service reviews:', error);
      setReviews([]);
    }
  }, [id, reviewPage]);

  useEffect(() => {
    fetchService();
    fetchReviews();
    fetchRelatedServicesSource();
  }, [fetchService, fetchReviews, fetchRelatedServicesSource]);

  const relatedServices = useMemo(() => {
    if (!service) return [];

    const currentId = String(service._id || id);
    const targetCategory = String(service.category || '').toLowerCase();
    const targetSubCategory = String(service.subCategory || '').toLowerCase();

    return allServices
      .filter((item) => String(item?._id || '') !== currentId)
      .map((item) => ({
        ...item,
        score:
          (String(item.category || '').toLowerCase() === targetCategory ? 3 : 0) +
          (String(item.subCategory || '').toLowerCase() === targetSubCategory ? 2 : 0) +
          (String(item.serviceType || '').toLowerCase() === String(service.serviceType || '').toLowerCase() ? 1 : 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.rating || 0) - Number(a.rating || 0))
      .slice(0, 4);
  }, [allServices, id, service]);

  const serviceMeta = useMemo(() => {
    if (!service) return [];

    const meta = [
      { label: 'Category', value: service.category || '—' },
      { label: 'Subcategory', value: service.subCategory || '—' },
      { label: 'Sub-subcategory', value: service.subSubCategory || '—' },
      { label: 'Service Type', value: service.serviceType || '—' },
      { label: 'Duration', value: `${service.estimatedDuration || 0} min` },
      { label: 'Reviews', value: `${service.reviewCount || 0}` },
      { label: 'GST From Customer', value: `${Number(service.gstFromCustomer || 0).toLocaleString('en-IN')}%` },
    ];

    if (canViewInternalCharges) {
      meta.push(
        { label: 'Commission To KLPro', value: `${Number(service.commissionToKlPro || 0).toLocaleString('en-IN')}%` },
        { label: 'Cash Payment Platform Charge', value: `${Number(service.cashPaymentPlatformChargeFromCustomer || 0).toLocaleString('en-IN')}%` }
      );
    }

    return meta;
  }, [canViewInternalCharges, service]);

  const handleBookNow = () => {
    if (!service) return;

    trackStartBooking({ serviceId: service._id || service.id, serviceName: service.name });

    localStorage.setItem(
      'bookingDraft',
      JSON.stringify({
        serviceId: service._id,
        serviceName: service.name,
        expectedPrice: service.basePrice,
      })
    );

    navigate(
      buildProfessionalsPath({
        service: service.name,
        category: service.category,
        subCategory: service.subCategory,
        subSubCategory: service.subSubCategory,
        serviceType: service.serviceType,
      })
    );
  };

  useEffect(() => {
    const serviceId = service?._id || service?.id;
    if (!serviceId || lastTrackedServiceId.current === serviceId) return;

    lastTrackedServiceId.current = serviceId;
    trackViewService({ serviceId, serviceName: service.name });
  }, [service]);

  if (loading) {
    return <div className="service-details-page loading-message">Loading service details...</div>;
  }

  if (!service) {
    return (
      <div className="service-details-page empty-state">
        <div className="empty-card">
          <p>Service not found</p>
          <button type="button" onClick={() => navigate('/services')}>
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="service-details-page">
      <section className="service-hero">
        <div className="service-hero-copy">
          <p className="eyebrow">Service details</p>
          <h1>{service.name}</h1>
          <div className="service-rating-row">
            {renderStars(service.rating || 0)}
            <span className="review-count">{service.reviewCount || 0} reviews</span>
          </div>
          <p className="service-description">{service.description}</p>
          <div className="service-price-row">
            <div>
              <span className="price-label">Starting at</span>
              <strong>₹{Number(service.basePrice || 0).toLocaleString('en-IN')}</strong>
            </div>
            <button type="button" className="primary-action" onClick={handleBookNow}>
              Book Now
            </button>
          </div>
        </div>
        <div className="service-hero-media">
          {service.image ? (
            <img src={service.image} alt={service.name} />
          ) : (
            <div className="image-placeholder">📷</div>
          )}
        </div>
      </section>

      <section className="service-summary-grid">
        {serviceMeta.map((item) => (
          <article key={item.label} className="summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="service-detail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">What you get</p>
            <h2>Full service details</h2>
          </div>
        </div>
        <div className="detail-grid">
          <div>
            <span>Category</span>
            <strong>{service.category || '—'}</strong>
          </div>
          <div>
            <span>Subcategory</span>
            <strong>{service.subCategory || '—'}</strong>
          </div>
          <div>
            <span>Sub-subcategory</span>
            <strong>{service.subSubCategory || '—'}</strong>
          </div>
          <div>
            <span>Service Type</span>
            <strong>{service.serviceType || '—'}</strong>
          </div>
          <div>
            <span>Estimated duration</span>
            <strong>{service.estimatedDuration || 0} minutes</strong>
          </div>
          <div>
            <span>Average rating</span>
            <strong>{Number(service.rating || 0).toFixed(1)} / 5</strong>
          </div>
        </div>
      </section>

      <section className="service-reviews-section">
        <div className="reviews-header">
          <div>
            <p className="eyebrow">Customer reviews</p>
            <h2>Reviews & Ratings</h2>
          </div>
          <div className="reviews-summary">
            <strong>{Number(service.rating || 0).toFixed(1)} / 5</strong>
            <span>{service.reviewCount || 0} reviews</span>
          </div>
        </div>

        {token && user ? (
          <ReviewForm
            serviceId={service._id}
            reviewType="service"
            subjectLabel={service.name}
            onReviewSubmit={() => {
              setReviewPage(1);
              fetchService();
              fetchReviews(1);
            }}
          />
        ) : (
          <div className="login-prompt">
            <p>Please log in to leave a review</p>
            <button type="button" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        )}

        <ReviewsList
          reviews={reviews}
          currentPage={reviewPage}
          totalPages={reviewPages}
          onPageChange={setReviewPage}
          emptyTitle="No service reviews yet"
          emptyMessage="Be the first to share your experience with this service."
        />
      </section>

      {relatedServices.length > 0 && (
        <section className="related-services-section">
          <div className="related-header">
            <div>
              <p className="eyebrow">More options</p>
              <h2>Related services</h2>
            </div>
            <button type="button" className="related-back-btn" onClick={() => navigate('/services')}>
              Browse all
            </button>
          </div>

          <div className="related-services-grid">
            {relatedServices.map((item) => (
              <button
                key={item._id || item.id}
                type="button"
                className="related-service-card"
                onClick={() => navigate(`/services/${item._id || item.id}`)}
              >
                <div className="related-service-image">
                  {item.image ? <img src={item.image} alt={item.name} /> : <div className="image-placeholder">📷</div>}
                </div>
                <div className="related-service-copy">
                  <span>{item.category}</span>
                  <strong>{item.name}</strong>
                  <p>⭐ {(Number(item.rating || 0)).toFixed(1)} · ₹{Number(item.basePrice || 0).toLocaleString('en-IN')}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ServiceDetails;
