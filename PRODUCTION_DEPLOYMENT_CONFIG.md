# Production Deployment Configuration for Wallet & Payment System

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables

- [ ] Update `.env` with production values
- [ ] Use production Razorpay credentials (Live Key)
- [ ] Set production MongoDB URI
- [ ] Enable HTTPS only
- [ ] Set NODE_ENV=production
- [ ] Generate strong JWT_SECRET
- [ ] Configure CORS for production domain
- [ ] Set appropriate commission percentage

### 2. Security Configuration

- [ ] Enable SSL/TLS certificate
- [ ] Configure firewall rules
- [ ] Set up rate limiting (NPM: express-rate-limit)
- [ ] Enable request validation middleware
- [ ] Set up CORS properly
- [ ] Configure helmet.js for security headers
- [ ] Enable HTTPS redirect
- [ ] Set secure cookies (httpOnly, Secure, SameSite)

### 3. Database Setup

- [ ] Create production MongoDB database
- [ ] Run migration script: `node setup-wallet-migration.js`
- [ ] Verify all indexes are created
- [ ] Set up database backups (daily)
- [ ] Configure database replication
- [ ] Test backup restoration
- [ ] Enable audit logging

### 4. Razorpay Configuration

- [ ] Switch from sandbox to production API keys
- [ ] Configure webhook endpoint: https://yourdomain.com/api/refund/webhook/razorpay
- [ ] Test webhook delivery
- [ ] Set up webhook signature verification
- [ ] Configure Razorpay notifications
- [ ] Test payment flow end-to-end

### 5. Monitoring & Logging

- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure application logging
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring
- [ ] Set up alerts for critical errors
- [ ] Create log aggregation setup
- [ ] Configure email notifications

### 6. Testing

- [ ] Run full integration tests
- [ ] Test all 25 API endpoints
- [ ] Test payment flow with Razorpay
- [ ] Test refund processing
- [ ] Test withdrawal processing
- [ ] Test admin operations
- [ ] Load testing (Apache JMeter/similar)
- [ ] Security testing (OWASP Top 10)

### 7. Deployment

- [ ] Create deployment script
- [ ] Test deployment process
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling (if needed)
- [ ] Set up deployment monitoring
- [ ] Create rollback plan
- [ ] Document deployment steps

## 📋 Production Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/klpro_production?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_very_long_random_secret_key_here_at_least_32_characters
JWT_EXPIRY=7d

# Razorpay (Production)
RAZORPAY_KEY_ID=rzp_live_Smla1VOnLmEtmC
RAZORPAY_KEY_SECRET=WIqCT8buD1KcFMr2AUhD2N51
RAZORPAY_WEBHOOK_URL=https://www.klpro.company/api/refund/webhook/razorpay

# Commission Configuration
COMMISSION_PERCENTAGE=10
WITHDRAWAL_MINIMUM_AMOUNT=100

# Admin Configuration
ADMIN_ID=system-admin-1

# CORS
CORS_ORIGIN=https://www.klpro.company,https://klpro.company

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@klpro.company

# AWS Configuration (if using S3 for files)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=klpro-production

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/klpro/app.log

# Session Configuration
SESSION_SECRET=your_session_secret_key_here
SESSION_TIMEOUT=86400000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
HELMET_ENABLED=true
HPP_ENABLED=true
HTTPS_ONLY=true
```

## 🔧 Nginx Configuration

```nginx
upstream klpro_backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name www.klpro.company klpro.company;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/klpro.crt;
    ssl_certificate_key /etc/ssl/private/klpro.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }

    # Logging
    access_log /var/log/nginx/klpro_access.log;
    error_log /var/log/nginx/klpro_error.log;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy Configuration
    location /api/ {
        proxy_pass http://klpro_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React frontend
    location / {
        root /var/www/klpro/client/build;
        try_files $uri $uri/ /index.html;
    }
}
```

## 🐳 Docker Configuration

```dockerfile
# Server Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run application
EXPOSE 5000
CMD ["node", "server.js"]
```

## 📦 Docker Compose for Production

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    container_name: klpro-mongodb
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD}
    ports:
      - "27017:27017"
    networks:
      - klpro-network
    restart: always

  backend:
    build: ./Server
    container_name: klpro-backend
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://root:${DB_PASSWORD}@mongodb:27017/klpro?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID}
      RAZORPAY_KEY_SECRET: ${RAZORPAY_KEY_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    networks:
      - klpro-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./Client
    container_name: klpro-frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: https://www.klpro.company/api
    networks:
      - klpro-network
    restart: always

  nginx:
    image: nginx:latest
    container_name: klpro-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - klpro-network
    restart: always

volumes:
  mongodb_data:
  mongodb_config:

networks:
  klpro-network:
    driver: bridge
```

## 🔄 Backup & Recovery Strategy

### Daily Backups

```bash
# Backup MongoDB daily at 2 AM
0 2 * * * mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/klpro" --out=/backups/klpro-$(date +\%Y-\%m-\%d)
```

### Backup Storage

- Local backup: `/backups` directory
- Cloud backup: AWS S3 with versioning enabled
- Retention: 30 days local, 90 days S3
- Test restore monthly

## 📊 Monitoring Setup

### Key Metrics to Monitor

- API response time (target: <200ms)
- Error rate (target: <0.1%)
- Database query time (target: <100ms)
- Payment success rate (target: >99%)
- Withdrawal processing time
- Refund approval time

### Alerts

- High error rate (>1%)
- Payment gateway down
- Database connection failure
- Memory usage >80%
- Disk usage >85%
- Payment webhook failures

## 🔒 Security Hardening

### API Security

- [ ] Enable rate limiting
- [ ] Implement CORS properly
- [ ] Use helmet.js
- [ ] Sanitize inputs
- [ ] Validate all requests
- [ ] Use HTTPS only
- [ ] Implement request timeout

### Database Security

- [ ] Enable authentication
- [ ] Use strong passwords
- [ ] Encrypt sensitive fields
- [ ] Implement row-level security
- [ ] Regular backups
- [ ] Database user permissions

### Deployment Security

- [ ] No default credentials
- [ ] Firewall rules
- [ ] SSH key-based auth only
- [ ] Disable root login
- [ ] Regular updates
- [ ] Security scanning

## 📈 Performance Optimization

- [ ] Enable gzip compression
- [ ] Implement caching (Redis)
- [ ] Database query optimization
- [ ] Connection pooling
- [ ] CDN for static files
- [ ] Database indexing
- [ ] Load balancing

## 🚨 Incident Response Plan

### Payment Failure

1. Check Razorpay status dashboard
2. Verify webhook delivery
3. Check API logs
4. Contact Razorpay support
5. Notify affected users

### Database Issue

1. Check database connectivity
2. Monitor disk space
3. Check replication status
4. Restore from backup if needed
5. Verify data integrity

### Security Breach

1. Isolate affected systems
2. Review logs
3. Notify users
4. Rotate credentials
5. Patch vulnerabilities

## ✅ Go-Live Checklist

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Runbooks created
- [ ] Team trained
- [ ] Customer communication prepared
- [ ] Rollback plan ready
- [ ] Post-launch review scheduled

## 📞 Support & Escalation

- Critical: On-call team, immediate response
- High: Team lead response within 1 hour
- Medium: Response within 4 hours
- Low: Response within 24 hours

---

**Deployment Date:** [To be filled]  
**Deployed By:** [To be filled]  
**Environment:** Production  
**Version:** 1.0.0
