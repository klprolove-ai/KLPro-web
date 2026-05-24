import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Create a router and opt-in to React Router v7 future flags to silence deprecation warnings
const router = createBrowserRouter([
  { path: '/*', element: <App /> }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
