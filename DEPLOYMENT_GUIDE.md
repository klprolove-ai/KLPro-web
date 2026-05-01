# KL-Pro Deployment Guide

## Current Deployment Status

### Frontend (Vercel)

- **URL**: https://kl-pro.vercel.app
- **Build**: React with react-scripts
- **Auto-deploy**: Enabled on push to main

### Backend (Render)

- **URL**: https://klpro-web.onrender.com
- **Runtime**: Node.js
- **Auto-deploy**: Enabled on push to main

## API Configuration

The frontend automatically connects to the backend based on the environment:

**Development (localhost)**

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API calls go to: `http://localhost:5000/api`

**Production (Vercel)**

- Frontend: https://kl-pro.vercel.app
- Backend: https://klpro-web.onrender.com
- API calls go to: `https://klpro-web.onrender.com/api`

## Frontend Environment Variables (Vercel)

To override the default production API URL, set environment variables in Vercel Dashboard:

1. Go to https://dashboard.vercel.com/
2. Select **KL-Pro** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   Name: REACT_APP_API_URL
   Value: https://klpro-web.onrender.com/api
   Environments: Production, Preview, Development
   ```
5. Save and redeploy

## Backend Environment Variables (Render)

Ensure these variables are set in Render Dashboard:

1. Go to https://dashboard.render.com/
2. Select **kl-pro-server** service
3. Go to **Environment**
4. Verify these are set:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `ADMIN_EMAIL`: Admin email address
   - `ADMIN_PASSWORD`: Admin password
   - `NODE_ENV`: production
   - `PORT`: 10000

## CORS Configuration

The backend allows requests from:

- http://localhost:3000 (local development)
- http://localhost:5000 (local API testing)
- https://kl-pro.vercel.app (production frontend)
- https://kl-pro-client.vercel.app (alternative domain)

## Admin Login Credentials

**Email**: klprolove@gmail.com
**Password**: Admin@123252423

## Troubleshooting

### CORS Errors

If you get CORS errors:

1. Verify the frontend is calling the correct backend URL
2. Check Render logs: `https://dashboard.render.com/`
3. Verify backend CORS configuration in `Server/server.js`

### Deployment Failed

1. Check build logs on Vercel or Render dashboard
2. Ensure all environment variables are set
3. Verify `.env` file in Server directory has correct MongoDB URI

### API Not Responding

1. Check if Render service is running: https://dashboard.render.com/
2. Verify network connectivity from Vercel to Render
3. Check MongoDB connection in Render logs

## Local Development

To run locally without deployment:

```bash
# Terminal 1: Start backend
cd Server
npm install
npm start

# Terminal 2: Start frontend
cd Client
npm install
npm start
```

Frontend will automatically connect to http://localhost:5000/api
