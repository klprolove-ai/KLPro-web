# CORS Issue Fix - Complete Deployment Guide

## Problem Summary
Your frontend at `https://www.klpro.company` was trying to access `http://localhost:5000`, which browsers block for security reasons. The solution involves:
1. Using your Render backend URL instead of localhost
2. Configuring CORS properly on both frontend and backend
3. Setting environment variables in Vercel

---

## Changes Made

### 1. ✅ Frontend Configuration Updated
**File:** `Client/src/config/apiConfig.js`
- Updated to intelligently detect environment (localhost vs production)
- Now respects `REACT_APP_API_URL` or `REACT_APP_BACKEND_URL` environment variables
- Falls back to `https://klpro-web.onrender.com/api` for production

### 2. ✅ Backend CORS Updated
**File:** `Server/server.js`
- Added `https://www.klpro.company` and `https://klpro.company` to CORS allowed origins
- Added `https://klpro-web.onrender.com` for Render backend domain

---

## Step-by-Step Deployment Instructions

### Step 1: Deploy Backend Changes to Render
```bash
cd Server
git add -A
git commit -m "Fix CORS configuration for klpro.company domain"
git push origin main
```

**In Render Dashboard:**
1. Go to your Render service (backend)
2. Wait for auto-deployment or manually deploy
3. Verify deployment is successful (check logs)

**Verify backend is running:**
```bash
# Test health check
curl https://klpro-web.onrender.com/
```

---

### Step 2: Set Environment Variables in Vercel

1. **Go to Vercel Dashboard** → Your Project
2. **Navigate to:** Settings → Environment Variables
3. **Add these variables:**

```
REACT_APP_API_URL=https://klpro-web.onrender.com/api
REACT_APP_BACKEND_URL=https://klpro-web.onrender.com/api
```

Or if your Render backend has a different URL, use that instead.

4. **Save and redeploy**

---

### Step 3: Deploy Frontend Changes to Vercel

```bash
cd Client
git add -A
git commit -m "Fix API configuration to use production backend URL"
git push origin main
```

**Vercel will automatically deploy.** Wait for the deployment to complete (check Vercel dashboard).

---

### Step 4: Verify the Fix

1. **Open your website:** `https://www.klpro.company`
2. **Check browser console** (F12 → Console tab)
3. **Look for:**
   - ✅ API calls to `https://klpro-web.onrender.com/api/...` (not localhost)
   - ✅ No CORS error messages
   - ✅ Data loading correctly (products, services, etc.)

---

## Troubleshooting

### Issue: Still seeing "localhost:5000" errors
**Solution:**
- Clear browser cache: `Ctrl+Shift+Delete`
- Hard refresh: `Ctrl+Shift+R`
- Check Vercel environment variables are set correctly
- Verify deployment completed

### Issue: Backend returning errors or 500 errors
**Solution:**
- Check Render service logs
- Verify MongoDB connection string in `.env`
- Ensure all required environment variables are set on Render

### Issue: CORS errors still appearing
**Solution:**
- Verify Render backend is running: `curl https://klpro-web.onrender.com/`
- Check server logs for CORS errors
- Ensure backend has been redeployed with updated `server.js`

---

## Quick Reference: Important URLs

| Environment | URL |
|------------|-----|
| Frontend (Production) | `https://www.klpro.company` |
| Backend (Render) | `https://klpro-web.onrender.com` |
| API Endpoint | `https://klpro-web.onrender.com/api` |
| Local Dev (Frontend) | `http://localhost:3000` |
| Local Dev (Backend) | `http://localhost:5000` |

---

## What Each Change Does

### Frontend Change (apiConfig.js)
```javascript
// Before: Always used localhost in production
// After: Detects environment and uses correct backend URL
- Uses REACT_APP_API_URL if set
- Uses localhost:5000 for development (localhost hostname)
- Uses Render backend for production
```

### Backend Change (server.js)
```javascript
// Before: Didn't explicitly allow klpro.company domain
// After: Added production domains to CORS whitelist
- Added 'https://www.klpro.company'
- Added 'https://klpro.company'
- Added 'https://klpro-web.onrender.com'
```

---

## Testing After Deployment

Use this test to verify everything works:

**In browser console (F12):**
```javascript
fetch('https://klpro-web.onrender.com/api/services/most-booked')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.log('Error:', e))
```

Expected result: Should return services data without CORS error.

---

## Next Steps

After successful deployment:
1. ✅ Test all pages load correctly
2. ✅ Test data fetching (products, services, reviews)
3. ✅ Test user interactions (add to cart, bookings, etc.)
4. ✅ Monitor for any errors in browser console

If you encounter any issues, check the browser console and Render service logs for detailed error messages.
