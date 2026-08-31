import React from 'react';
import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import AnalyticsRouteTracker from './AnalyticsRouteTracker';

beforeEach(() => {
  window.dataLayer = [];
  document.title = 'KLPro Route Test';
});

test('tracks each route once without duplicate events for one navigation', async () => {
  const router = createMemoryRouter([
    { path: '*', element: <AnalyticsRouteTracker /> },
  ], { initialEntries: ['/services'] });

  render(<RouterProvider router={router} />);
  expect(window.dataLayer).toHaveLength(1);
  expect(window.dataLayer[0]).toMatchObject({ event: 'virtual_page_view', page_path: '/services' });

  await act(async () => {
    await router.navigate('/products?search=fan');
  });
  expect(window.dataLayer).toHaveLength(2);
  expect(window.dataLayer[1]).toMatchObject({ event: 'virtual_page_view', page_path: '/products?search=fan' });
});
