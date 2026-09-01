const canUseWindow = () => typeof window !== 'undefined';

export const initializeDataLayer = () => {
  if (!canUseWindow()) return null;

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
};

export const pushToDataLayer = (eventData) => {
  const dataLayer = initializeDataLayer();
  if (!dataLayer || !eventData) return false;

  dataLayer.push(eventData);
  return true;
};

export const trackEvent = (event, eventData = {}) => pushToDataLayer({
  event,
  ...eventData,
});

export const trackPageView = ({ pagePath, pageTitle } = {}) => trackEvent('virtual_page_view', {
  page_path: pagePath || (canUseWindow() ? `${window.location.pathname}${window.location.search}` : ''),
  page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
});

export const trackMetaPageView = () => {
  if (!canUseWindow() || typeof window.fbq !== 'function') return false;

  window.fbq('track', 'PageView');
  return true;
};

export const trackLogin = (method) => trackEvent('login', method ? { method } : {});
export const trackSignup = (accountType) => trackEvent('sign_up', accountType ? { account_type: accountType } : {});
export const trackViewProduct = ({ productId, productName }) => trackEvent('view_product', {
  product_id: productId,
  product_name: productName,
});
export const trackViewService = ({ serviceId, serviceName }) => trackEvent('view_service', {
  service_id: serviceId,
  service_name: serviceName,
});
export const trackViewProfessional = ({ professionalId, professionalName }) => trackEvent('view_professional', {
  professional_id: professionalId,
  professional_name: professionalName,
});
export const trackSearch = (query) => trackEvent('search', { search_term: query });
export const trackStartBooking = ({ serviceId, serviceName, professionalId } = {}) => trackEvent('start_booking', {
  service_id: serviceId,
  service_name: serviceName,
  ...(professionalId ? { professional_id: professionalId } : {}),
});
export const trackBookingCompleted = ({ bookingId, value, currency = 'INR' } = {}) => trackEvent('booking_completed', {
  booking_id: bookingId,
  ...(Number.isFinite(value) ? { value, currency } : {}),
});
export const trackAddToCart = ({ productId, productName, value, currency = 'INR' }) => trackEvent('add_to_cart', {
  product_id: productId,
  product_name: productName,
  ...(Number.isFinite(value) ? { value, currency } : {}),
});
export const trackBeginCheckout = ({ value, currency = 'INR' } = {}) => trackEvent('begin_checkout', {
  ...(Number.isFinite(value) ? { value, currency } : {}),
});
export const trackPurchase = ({ transactionId, value, currency = 'INR' } = {}) => trackEvent('purchase', {
  transaction_id: transactionId,
  ...(Number.isFinite(value) ? { value, currency } : {}),
});
