# Deployment Checklist - HomLink

## Pre-Deployment Verification

### Backend Code Review
- [ ] All environment variables defined in `.env`
- [ ] `DEBUG = False` in production settings
- [ ] `ALLOWED_HOSTS` configured with production domain
- [ ] `SECRET_KEY` is strong and unique
- [ ] Database migrations are current: `python manage.py migrate`
- [ ] No `print()` statements left in code
- [ ] All imports are used (run `django-extensions` checker)
- [ ] API documentation is accessible at `/api/schema/swagger-ui/`

### Frontend Code Review
- [ ] API base URL updated: `frontend/js/api.js` line 5
- [ ] All 9 HTML pages created and tested
- [ ] All external links point to correct pages
- [ ] No `console.log()` left in production code
- [ ] Images are optimized and from Cloudinary
- [ ] Mobile responsive tested on real devices (< 640px)
- [ ] No hardcoded localhost references

### Security Checklist
- [ ] HTTPS enabled on backend domain (Railway auto-provides)
- [ ] CORS origins match production domains
- [ ] JWT tokens are not logged anywhere
- [ ] M-Pesa callback is CSRF-exempt
- [ ] Rate limiting enabled on /auth/ endpoints
- [ ] No sensitive data in git history
- [ ] `.env` files are in `.gitignore`
- [ ] Database password is strong (20+ chars)

---

## Step 1: Deploy Backend to Railway

### 1.1 Prepare Repository
```bash
cd backend
git init
git add .
git commit -m "Initial commit: RentConnect backend"
git remote add origin https://github.com/yourusername/rentconnect.git
git push -u origin main
```

### 1.2 Setup Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize and select your HomLink repo
5. Click "Deploy"

### 1.3 Add Database & Cache
1. In Railway dashboard, click "Add"
2. Select "PostgreSQL"
   - Railway creates DB automatically
   - CONNECTION_URL is auto-injected as `DATABASE_URL`
3. Select "Redis"
   - Redis is auto-injected as `REDIS_URL`

### 1.4 Set Environment Variables
In Railway dashboard → Settings → Environment:

```env
DEBUG=False
SECRET_KEY=your-very-long-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-railway-url.up.railway.app/api/payments/mpesa/callback/
MPESA_ENVIRONMENT=production

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 1.5 Configure Domain
1. Railway dashboard → Settings → Domain
2. Add custom domain: `api.yourdomain.com`
3. Update DNS records at domain registrar (CNAME to Railway)

### 1.6 Verify Deployment
```bash
# Check logs
railway logs web

# Test API
curl https://your-railway-url.up.railway.app/api/schema/

# Run migrations on production
railway run python manage.py migrate

# Seed test data (optional for testing)
railway run python manage.py seed_data
```

---

## Step 2: Deploy Frontend to Netlify

### 2.1 Prepare Files
```bash
cd frontend

# Create a netlify.toml for configuration
cat > netlify.toml << 'EOF'
[build]
  command = ""
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/css/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
EOF
```

### 2.2 Deploy to Netlify
Option A - Via Git:
1. Push to GitHub: `git push origin main`
2. Go to https://netlify.com
3. Click "New site from Git"
4. Select your repo
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: frontend

Option B - Drag & Drop:
1. Go to https://netlify.com
2. Drag `frontend/` folder into deploy area
3. Done! Netlify generates URL

### 2.3 Setup Custom Domain
1. Netlify dashboard → Site settings → Domain management
2. Add custom domain: `yourdomain.com`
3. Update DNS records (CNAME or A record)
4. Enable HTTPS (Netlify provides free SSL)

### 2.4 Configure Environment
Create `frontend/.env.production`:
```env
API_URL=https://your-railway-url.up.railway.app/api
FRONTEND_URL=https://yourdomain.com
```

Update `frontend/js/api.js` to use environment if available

### 2.5 Test Deployment
```bash
# Visit your domain
https://yourdomain.com

# Check:
- Homepage loads
- API calls work (check Network tab)
- Login/logout flows
- Search filtering
- Image loading
```

---

## Step 3: Configure M-Pesa for Production

### 3.1 Safaricom Daraja Setup
1. Register at https://developer.safaricom.co.ke
2. Create new app
3. Get credentials:
   - Consumer Key
   - Consumer Secret
   - Shortcode
   - Passkey
4. Apply for production environment access

### 3.2 Update Backend
Set in Railway environment variables:
```env
MPESA_CONSUMER_KEY=prod_key
MPESA_CONSUMER_SECRET=prod_secret
MPESA_PASSKEY=prod_passkey
MPESA_ENVIRONMENT=production  # Changed from sandbox
MPESA_CALLBACK_URL=https://your-railway-url.up.railway.app/api/payments/mpesa/callback/
```

### 3.3 Test M-Pesa Flow
1. As landlord, create property listing
2. Go through payment flow
3. Use real M-Pesa phone number
4. Verify STK prompt appears on phone
5. Complete payment
6. Check listing goes live automatically

---

## Step 4: Setup Monitoring & Maintenance

### 4.1 Logging
```bash
# View Railway logs
railway logs web -t

# Check for errors
railway logs web | grep ERROR

# Monitor Celery
railway logs celery
```

### 4.2 Database Backups
```bash
# Railway auto-backs up daily, but manually backup:
railway run python manage.py dumpdata > backup.json

# Restore if needed:
railway run python manage.py loaddata backup.json
```

### 4.3 Monitoring
- Set up Railway alerts for service down
- Monitor email delivery
- Track M-Pesa callback failures
- Monitor database size growth

---

## Step 5: Post-Deployment Tasks

### 5.1 Cleanup
- [ ] Remove test data (optional)
- [ ] Delete hardcoded debug values
- [ ] Review admin interface
- [ ] Test all user flows once more

### 5.2 DNS & SSL
- [ ] Verify HTTPS working (green lock)
- [ ] Test both www and non-www domains
- [ ] Redirect www to non-www (or vice versa)
- [ ] Check SSL certificate validity

### 5.3 Email Configuration
If using Gmail:
1. Enable 2-factor auth on Gmail account
2. Generate app-specific password
3. Add to EMAIL_HOST_PASSWORD

### 5.4 Search Engine Optimization
- [ ] Add robots.txt
- [ ] Add sitemap.xml
- [ ] Add meta descriptions to pages
- [ ] Submit to Google Search Console

### 5.5 Analytics (Optional)
Add to frontend/index.html:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXXXX-X"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'UA-XXXXXXXXX-X');
</script>
```

---

## Troubleshooting Deployment Issues

### Backend Won't Start
```bash
# Check logs
railway logs web

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Django migrations not run

# Fix:
railway run python manage.py migrate
railway restart web
```

### Frontend Shows "Cannot find module"
- Verify API URL is correct in api.js
- Check browser Network tab for failed requests
- Ensure backend is deployed and healthy

### M-Pesa Payments Failing
- Verify callback URL is publicly accessible
- Check M-Pesa credentials are correct
- Test in sandbox first before production
- Check Railway logs for errors

### Images Not Loading
- Verify Cloudinary credentials
- Check CLOUDINARY_URL is set
- Test upload manually in Django admin
- Verify storage is set to Cloudinary

### Database Full/Slow
```bash
# Check size
railway run python manage.py dbshell

# Clean old notifications
railway run python manage.py shell
# >>> from apps.notifications.models import Notification
# >>> Notification.objects.filter(created_at__lt=datetime.now()-timedelta(days=90)).delete()

# Add database index if needed
railway run python manage.py sqlsequencereset apps | railway run python manage.py dbshell
```

---

## Performance Optimization

### Backend
- [ ] Enable caching headers in settings
- [ ] Add database query optimization
- [ ] Enable gzip compression
- [ ] Use CDN for static files

### Frontend
- [ ] Minimize JavaScript files
- [ ] Compress images (use Cloudinary auto-optimization)
- [ ] Enable browser caching
- [ ] Lazy-load images below fold

---

## Final Verification Checklist

- [ ] Backend API returns 200 on `/api/schema/`
- [ ] Frontend loads without CORS errors
- [ ] Login flow works end-to-end
- [ ] Property creation works
- [ ] M-Pesa payment initiates
- [ ] Admin panel is accessible
- [ ] Search/filters work
- [ ] Responsive on mobile (< 640px)
- [ ] All images load from Cloudinary
- [ ] HTTPS is enforced
- [ ] Emails send successfully (test with user registration)
- [ ] Notifications appear in real-time

---

## Rollback Plan

If HomLink production breaks:

```bash
# Rollback to previous git commit
git revert HEAD

# Deploy old version
git push origin main

# Railway auto-redeploys

# Or manually trigger Railway rebuild
railway redeploy
```

---

**Deployment Status:**
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Netlify  
- [ ] Domain configured
- [ ] SSL/HTTPS working
- [ ] M-Pesa production enabled
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Email service working
- [ ] All tests passing

**You're live! 🚀**

