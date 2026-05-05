# CORS Error Fix - Complete Guide

## Problem Explanation

Your production site (`https://www.klpro.company`) was trying to access `http://localhost:5000`, which browsers block for security reasons. This is the **loopback address space restriction** - browsers prevent public websites from accessing local servers.

### Error Pattern:
```
Access to fetch at 'http://localhost:5000/api/*' from origin 'https://www.klpro.company' 
has been blocked by CORS policy: Permission was denied for this request to access 
the `loopback` address space.
```

## Solution Overview

The fix uses **environment-based API URLs**:
- **Development**: Uses `http://localhost:5000/api` 
- **Production**: Uses your production backend URL (e.g., Render, Heroku, or dedicated server)

## Implementation Steps

### Step 1: Update `.env.production` File

Edit `Client/.env.production` and replace with your ACTUAL backend URL:

```env
# Option A: If using Render backend
REACT_APP_API_URL=https://klpro-web.onrender.com/api
REACT_APP_BACKEND_URL=https://klpro-web.onrender.com/api

# Option B: If using a custom backend server
REACT_APP_API_URL=https://api.klpro.company/api
REACT_APP_BACKEND_URL=https://api.klpro.company/api

# Option C: If backend is on same domain
REACT_APP_API_URL=/api
REACT_APP_BACKEND_URL=/api
```

### Step 2: Environment Variable Priority

The API configuration now checks in this order:
1. `REACT_APP_API_URL` (if set)
2. `REACT_APP_BACKEND_URL` (if set)  
3. Auto-detect based on hostname
4. Fallback to Render backend

### Step 3: Build and Deploy

#### For React App:
```bash
cd Client
npm install
npm run build

# The build process will use .env.production for production builds
```

#### Deploy built files to your hosting:
- If using Vercel: Push to GitHub, Vercel auto-deploys
- If using static hosting: Copy `Client/build/*` to your web server

### Step 4: Server Configuration

The server's CORS is now configured to accept:
- ✅ `https://www.klpro.company`
- ✅ `https://klpro.company`
- ✅ `http://localhost:3000` (dev)
- ✅ `https://klpro-web.onrender.com`
- ✅ Other approved origins

## Deployment Scenarios

### Scenario A: Backend on Render
1. Keep your backend running on `https://klpro-web.onrender.com`
2. Set `REACT_APP_API_URL=https://klpro-web.onrender.com/api` in `.env.production`
3. Deploy frontend to any hosting (Vercel, Netlify, etc.)

### Scenario B: Backend on Dedicated Server
1. If you have `api.klpro.company` or `backend.klpro.company`
2. Set `REACT_APP_API_URL=https://api.klpro.company/api` in `.env.production`
3. Ensure server's CORS includes `https://www.klpro.company`

### Scenario C: Relative API Paths
1. If frontend and backend are on same domain (e.g., both on klpro.company)
2. Set `REACT_APP_API_URL=/api` in `.env.production`
3. Configure your web server to proxy `/api/*` to backend

## Verification

After deploying, open browser DevTools and check:

**Console should show:**
```
API_BASE_URL: https://your-production-backend/api
```

**Network tab should show:**
- ✅ Requests to your production backend (NOT localhost)
- ✅ Responses with `Access-Control-Allow-Origin` header

## Testing Locally

During development:
```bash
cd Client
npm start  # Uses .env.development → localhost:5000

cd ../Server
npm start  # Should be running on port 5000
```

## Troubleshooting

### If still getting CORS errors:
1. Check `.env.production` is correct
2. Ensure backend is running at specified URL
3. Verify backend CORS includes your frontend domain
4. Hard refresh browser (Ctrl+Shift+R) to clear cache

### If WebSocket errors persist:
- Socket.IO CORS is also configured to accept your domain
- Ensure WebSocket connections use correct backend URL

### For debugging:
- Open DevTools Console → Look for `API_BASE_URL:` log
- Check Network tab → See actual request URLs

## Files Modified

✅ `Client/.env.production` - Production API URL
✅ `Client/.env.development` - Development API URL  
✅ `Client/src/config/apiConfig.js` - Added logging for debugging
✅ `Server/server.js` - Improved CORS & Socket.IO configuration

## Next Steps

1. **Update `.env.production`** with your actual backend URL
2. **Test locally** with `npm start`
3. **Build for production** with `npm run build`
4. **Deploy** the build to your hosting
5. **Verify** in production that API calls work

---

**Questions?** Check the logs in DevTools Console for `API_BASE_URL:` and Network tab for actual request URLs.
