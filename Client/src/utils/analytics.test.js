import { initializeDataLayer, pushToDataLayer, trackBookingCompleted, trackPageView, trackPurchase } from './analytics';

beforeEach(() => {
  window.dataLayer = [];
  document.title = 'KLPro Test';
  window.history.pushState({}, '', '/services?category=home');
});

test('initializes and pushes to the dataLayer', () => {
  delete window.dataLayer;
  expect(initializeDataLayer()).toEqual([]);
  expect(pushToDataLayer({ event: 'test_event' })).toBe(true);
  expect(window.dataLayer).toEqual([{ event: 'test_event' }]);
});

test('tracks a virtual page view with the current path and title', () => {
  trackPageView();
  expect(window.dataLayer).toEqual([{
    event: 'virtual_page_view',
    page_path: '/services?category=home',
    page_title: 'KLPro Test',
  }]);
});

test('uses safe booking and purchase payloads', () => {
  trackBookingCompleted({ bookingId: 'booking-1', value: 499 });
  trackPurchase({ transactionId: 'order-1', value: 1299 });
  expect(window.dataLayer).toEqual([
    { event: 'booking_completed', booking_id: 'booking-1', value: 499, currency: 'INR' },
    { event: 'purchase', transaction_id: 'order-1', value: 1299, currency: 'INR' },
  ]);
});
