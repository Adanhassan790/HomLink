# HomLink - Property Rental Marketplace

A production-ready full-stack property rental marketplace connecting tenants with landlords across Kenya. Built with Django REST Framework backend and vanilla HTML/CSS/JavaScript frontend.

## 🚀 Features

### Phase 1 MVP
- ✅ User authentication (Tenant/Landlord/Admin roles)
- ✅ Property listings with multi-image uploads
- ✅ Advanced search and filtering by location, price, amenities
- ✅ Property detail pages with contact via WhatsApp
- ✅ M-Pesa payment integration for listing fees (KES 300)
- ✅ Admin approval workflow for listings
- ✅ User inquiries and messaging
- ✅ Favorites/bookmarking system
- ✅ Property reviews and ratings
- ✅ Responsive design (mobile-first)
- ✅ Sticky navbar with notifications
- ✅ Role-based dashboards

### Technology Stack

**Backend:**
- Django 5.0 + Django REST Framework
- PostgreSQL 16 database
- Redis + Celery for background tasks
- JWT authentication (djangorestframework-simplejwt)
- Cloudinary for image storage
- M-Pesa Daraja API integration

**Frontend:**
- Vanilla HTML5/CSS3/JavaScript (ES6+)
- No frameworks or build tools
- Fetch API for backend communication
- CSS custom properties for theming
- Responsive CSS Grid & Flexbox

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL + Redis services
- Railway deployment-ready
- Netlify frontend hosting

## 📁 Project Structure

```
RentConnect/
├── backend/                    # Django REST API
│   ├── config/                 # Django settings & URLs
│   ├── apps/
│   │   ├── users/             # Authentication & profiles
│   │   ├── properties/        # Properties, amenities, locations
│   │   ├── payments/          # M-Pesa integration
│   │   └── notifications/     # User notifications
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
└── frontend/                   # Vanilla HTML/CSS/JS
    ├── index.html             # Homepage
    ├── search.html            # Search results
    ├── property.html          # Property detail
    ├── login.html & register.html
    ├── create-listing.html    # Landlord listing form
    ├── dashboard-*.html       # Role dashboards
    ├── css/
    │   ├── main.css          # Global styles & variables
    │   ├── navbar.css        # Navigation
    │   ├── cards.css         # Property cards
    │   ├── forms.css         # Form styling
    │   └── dashboard.css     # Dashboard layout
    └── js/
        ├── utils.js          # Helper functions
        ├── api.js            # Backend API wrapper
        ├── auth.js           # Auth management
        ├── main.js           # Homepage logic
        ├── search.js         # Search page
        ├── property.js       # Property detail
        ├── create-listing.js # Listing creation
        └── dashboard-*.js    # Dashboard scripts
```

## 🛠 Installation & Setup

### Prerequisites
- Docker & Docker Compose
- OR: Python 3.11+, PostgreSQL 16, Redis 7

### Quick Start with Docker

```bash
# Clone repository
git clone https://github.com/yourusername/homlink.git
cd homlink

# Copy environment file
cp backend/.env.example backend/.env

# Edit .env with your credentials:
# - Cloudinary API keys
# - M-Pesa credentials (sandbox for testing)
# - Email configuration

# Build and run
docker-compose up -d

# Seed database with test data
docker-compose exec web python manage.py seed_data

# Backend ready at http://localhost:8000
# Frontend: Open frontend/index.html in browser
# API docs: http://localhost:8000/api/schema/swagger-ui/
```

### Manual Setup (Without Docker)

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Setup database
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed test data
python manage.py seed_data

# Run development server
python manage.py runserver

# In another terminal, run Celery
celery -A config worker -l info
```

**Frontend:**
```bash
cd frontend

# Simply open index.html in your browser
# Or use a simple HTTP server:
python -m http.server 3000
# Visit http://localhost:3000
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:8000/api`
- Production: `https://your-railway-app.up.railway.app/api`

### Interactive Docs
Visit `/api/schema/swagger-ui/` for interactive Swagger UI

### Authentication

```javascript
// Login and get tokens
POST /auth/login/
{
  "username": "user@example.com",
  "password": "password123"
}

// Response:
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": { "id": 1, "role": "tenant", ... }
}

// Use access token for authenticated requests
Authorization: Bearer <access_token>

// Refresh token when expired
POST /auth/token/refresh/
{ "refresh": "<refresh_token>" }
```

### Key Endpoints

**Properties:**
- `GET /properties/` - List (with filters: county, town, property_type, min_rent, max_rent)
- `POST /properties/` - Create (landlord only)
- `GET /properties/{id}/` - Detail
- `PUT /properties/{id}/` - Update (owner only)
- `DELETE /properties/{id}/` - Delete (owner only)
- `POST /properties/{id}/upload_images/` - Upload images
- `GET /properties/featured/` - Featured listings
- `GET /properties/my_listings/` - User's listings

**Inquiries & Favorites:**
- `POST /properties/inquiries/create_inquiry/` - Ask about property
- `POST /properties/favorites/add_favorite/` - Save property
- `DELETE /properties/favorites/remove/{property_id}/` - Unsave

**Payments:**
- `POST /payments/initiate_mpesa/` - Start M-Pesa payment
- `POST /payments/mpesa/callback/` - M-Pesa callback (auto)
- `GET /payments/history/` - Payment history

**Admin:**
- `GET /admin/properties/pending/` - Pending approvals
- `POST /admin/properties/{id}/approve/` - Approve listing
- `POST /admin/properties/{id}/reject/` - Reject listing
- `POST /admin/landlords/{id}/verify/` - Verify landlord

## 💳 M-Pesa Integration

### Setup (Daraja)

1. Register at [safaricom developer portal](https://developer.safaricom.co.ke)
2. Create app and get credentials:
   - Consumer Key
   - Consumer Secret
   - Shortcode
   - Passkey

3. Add to `.env`:
```env
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback/
MPESA_ENVIRONMENT=sandbox  # or production
```

### Testing M-Pesa

1. Use test phone: `254712345678` (Safaricom sandbox)
2. Frontend initiates payment with phone + amount
3. Tenant receives STK prompt
4. Backend receives callback and activates listing
5. Landlord can see payment in dashboard

## 🎨 Frontend Architecture

### CSS System
- **CSS Custom Properties** for theming (--color-*, --spacing-*, --font-*)
- **Mobile-first** responsive design
- **No CSS framework** - pure CSS Grid & Flexbox
- **Utility classes** for common patterns

### JavaScript Patterns
- **Module system** (ES6 imports/exports)
- **Fetch API** for all HTTP requests
- **Async/await** throughout
- **No page reloads** - dynamic DOM updates
- **URL query params** for page state

### Key Functions

**API Wrapper (api.js):**
```javascript
import * as api from './api.js';

// All functions handle JWT automatically
const properties = await api.getProperties({ county: 'Nairobi' });
const property = await api.getProperty(1);
await api.createProperty(propertyData);
await api.initiateM2Pesa(phone, 300, 'listing_fee', propertyId);
```

**Authentication (auth.js):**
```javascript
import { handleLogin, requireAuth, getCurrentUser } from './auth.js';

// Login
await handleLogin(username, password);

// Protect pages
requireAuth();  // Redirect if not logged in
requireRole('landlord');  // Only landlords

// Get current user
const user = getCurrentUser();
```

**Utilities (utils.js):**
```javascript
import { formatCurrency, showToast, renderNavbar } from './utils.js';

formatCurrency(30000);  // KES 30,000
showToast('Success!', 'success');
renderNavbar(currentUser);  // Render sticky navbar
```

## 🚀 Deployment

### Backend Deployment (Railway)

1. Push to GitHub
2. Connect Railway to GitHub repo
3. Add plugins: PostgreSQL 16, Redis
4. Set environment variables (see `.env.example`)
5. Deploy - Railway auto-detects Django

```bash
# Database migrations auto-run
# Static files auto-collected
# Gunicorn runs on port 8000
```

### Frontend Deployment (Netlify)

```bash
# 1. Simple drag-and-drop
#    - Drag frontend/ folder to Netlify dashboard
#    - No build step needed!

# 2. Or via Git
#    - Connect GitHub repo
#    - Build command: (leave empty)
#    - Publish directory: frontend
#    - Deploy
```

### Update Frontend API URL

In production, update `frontend/js/api.js`:
```javascript
const API_BASE = 'https://your-railway-app.up.railway.app';
```

Or use environment:
```javascript
const API_BASE = process.env.API_URL || 'http://localhost:8000';
```

## 🧪 Testing

### Test Credentials (After seed_data)
```
Admin:     admin / admin123
Landlord:  landlord1 / password123
Tenant:    tenant1 / password123
```

### Test Flow
1. Register new account (choose role)
2. Login and verify profile
3. **As Landlord:**
   - Create property listing
   - Upload images
   - Initiate M-Pesa payment (sandbox)
   - Check dashboard
4. **As Tenant:**
   - Search/browse properties
   - Add to favorites
   - Send inquiry
   - Leave review
5. **As Admin:**
   - Check pending listings
   - Approve/reject
   - Verify landlords

## 📱 Responsive Design

- **Mobile (< 640px):** Single column, touch-friendly
- **Tablet (640px - 1024px):** 2-column layouts
- **Desktop (> 1024px):** Full 3-4 column grids

Tested on:
- iPhone SE/12/13/14/15
- Samsung A51/A71
- iPad
- Chrome/Safari/Firefox

## 🔒 Security Features

- ✅ JWT authentication with token refresh
- ✅ HTTPS recommended for production
- ✅ CORS configured per environment
- ✅ M-Pesa callback CSRF-exempt (signed by M-Pesa)
- ✅ Input validation (frontend + backend)
- ✅ Rate limiting on auth endpoints (backend)
- ✅ No sensitive data in localStorage

## 🐛 Troubleshooting

### "Property not found" (404)
- Check if property is approved: `is_approved=True` required
- Use `/properties/my_listings/` to see unapproved ones

### M-Pesa payment not working
- Verify credentials in Railway/Docker environment
- Check MPESA_CALLBACK_URL is publicly accessible
- Monitor logs: `docker logs homlink_web_1`

### Images not loading
- Verify Cloudinary credentials
- Check `DEFAULT_FILE_STORAGE` in settings
- Use `python manage.py collectstatic`

### CORS errors
- Backend CORS origins must include frontend domain
- Check `CORS_ALLOWED_ORIGINS` in settings.py

## 📞 Support

For issues:
1. Check API logs: `docker logs homlink_web_1`
2. Check browser console: F12 → Console tab
3. Test API endpoint directly: `/api/schema/swagger-ui/`

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Django community & DRF documentation
- Safaricom Daraja API
- Kenya county/town data

---

**HomLink - Connecting landlords and tenants across Kenya**
