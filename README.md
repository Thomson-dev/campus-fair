# Campus Fair API

A modern REST API backend for the Campus Fair application, providing authentication, vendor management, and order processing for campus events.

## 🚀 Tech Stack

- **Runtime:** Node.js (v18+)
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + Google OAuth
- **Image Storage:** Cloudinary
- **Email Service:** Nodemailer
- **Security:** Helmet, CORS, Rate Limiting 
- **Logging:** Morgan

## ✨ Features

- **User Authentication**
  - Student, Vendor, and Organizer role-based registration
  - JWT-based authentication
  - Google Sign-In integration (students only)
  - Password reset via email
  - FCM push token storage for notifications

- **Vendor Management**
  - Create and manage vendor profiles
  - Photo uploads to Cloudinary
  - Gallery management
  - Contact, delivery methods, and bank details
  - Vendor code system — students save vendors by 6-character code

- **Order Management**
  - Students place orders for pickup or delivery — no online payment; the student pays the vendor directly (cash or transfer) when the order is handed over
  - Vendors confirm → ready → deliver orders
  - Students can cancel pending orders or dispute delivered orders
  - Full status history tracking (`statusHistory` array)

- **Push Notifications**
  - Firebase Admin SDK integration
  - Students receive push notification when they save a vendor by code
  - FCM tokens stored per user on login

- **Events**
  - Organizers create and manage trade fair events
  - Public event listing and detail
  - Vendor roster per event

- **Security**
  - Rate limiting on auth endpoints
  - Helmet for HTTP headers security
  - CORS protection
  - Password hashing with bcryptjs

## 📋 Prerequisites

- Node.js v18 or higher
- MongoDB connection (Atlas or local)
- Cloudinary account (for image uploads)
- Email service credentials (Nodemailer)

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file** in the backend root:
   ```env
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=1d
   NODE_ENV=development
   CLIENT_ORIGIN=http://localhost:5000
   
   # Cloudinary (for image uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Email
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM=noreply@campusfair.com
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

## 🏃 Running the Server

### Development Mode (with hot reload)
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

The API will be available at `http://localhost:5000`

## ✅ Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "env": "development"
}
```

## 📚 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/student` | Register as a student |
| POST | `/register/vendor` | Register as a vendor |
| POST | `/register/organizer` | Register as an organizer |
| POST | `/login` | Login with email and password |
| POST | `/google` | Google Sign-In authentication |
| GET | `/me` | Get current user info (requires auth) |
| POST | `/forgot-password` | Request password reset email |
| POST | `/reset-password/:token` | Reset password with token |
| POST | `/fcm-token` | Save FCM push token for the logged-in user (requires auth) |

### Vendor (`/api/vendor`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profile` | Create vendor profile (vendor only) |
| GET | `/profile` | Get own vendor profile (vendor only) |
| PUT | `/profile` | Update vendor profile (vendor only) |
| POST | `/profile/photo` | Upload profile photo (vendor only) |
| POST | `/profile/gallery` | Add gallery image (vendor only) |
| DELETE | `/profile/gallery/:publicId` | Remove gallery image (vendor only) |
| PUT | `/profile/contact` | Update contact info (vendor only) |
| PUT | `/profile/delivery` | Update delivery methods & fees (vendor only) |
| PUT | `/profile/bank` | Update bank details (vendor only) |
| GET | `/by-code/:code` | Get vendor profile by vendor code (public) |
| GET | `/:userId/profile` | Get public vendor profile |
| POST | `/save` | Increment vendor save count (student only) |

### Student (`/api/student`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/saved` | Get student's saved vendors (student only) |
| POST | `/save-by-code` | Save a vendor by their vendor code (student only) |
| DELETE | `/saved/:vendorId` | Unsave a vendor (student only) |
| GET | `/vendors` | Browse all vendors, supports `?category=` and `?q=` (public) |

### Products (`/api/products`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a product (vendor only) |
| GET | `/vendor/:vendorId` | List products for a vendor (public) |
| PATCH | `/:id` | Update a product (vendor only) |
| DELETE | `/:id` | Delete a product (vendor only) |
| PATCH | `/:id/availability` | Toggle product availability (vendor only) |
| POST | `/:id/image` | Upload product image (vendor only) |

### Orders (`/api/orders`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Place a new order (student only) — no payment processing; the order is created directly |
| GET | `/student` | Get all orders for the logged-in student (student only) |
| GET | `/vendor` | Get all orders for the logged-in vendor (vendor only) |
| GET | `/:id` | Get order detail (any authenticated user) |
| PATCH | `/:id/action` | Cancel a pending order or dispute a delivered order (student only) |
| PATCH | `/:id/status` | Update order status: confirmed → ready → delivered / rejected (vendor only) |

**Order statuses:** `pending` → `confirmed` → `ready` → `delivered`. Can also become `rejected`, `cancelled`, or `disputed`.

**Payment model:** the app facilitates the order, tracking, and notifications only — it does not process payment. The student pays the vendor in person (cash or bank transfer) when the order is handed over, whether that's pickup, hostel delivery, or courier. There is no payment gateway, webhook, or automatic refund — if a vendor never delivers, no money was ever taken.

**Student actions (`PATCH /:id/action` body):**
```json
{ "action": "cancel" }             // only allowed when status is pending
{ "action": "dispute", "reason": "Item was wrong" }  // only allowed when status is delivered
```

### Announcements (`/api/announcements`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create announcement (vendor only) |
| GET | `/vendor/:vendorId` | Get announcements for a vendor (public) |
| DELETE | `/:id` | Delete an announcement (vendor only) |

### Events (`/api/events`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all events (public) |
| GET | `/:id` | Get event detail (public) |
| POST | `/` | Create an event (organizer only) |
| PUT | `/:id` | Update an event (organizer only) |
| POST | `/:id/vendors` | Add a vendor to an event (organizer only) |
| DELETE | `/:id/vendors/:vendorId` | Remove a vendor from an event (organizer only) |

## 🔐 Authentication

All protected endpoints require an Authorization header:

```bash
Authorization: Bearer <JWT_TOKEN>
```

### Getting a Token

1. Register or login to receive a JWT token
2. Include token in all authenticated requests
3. Token expires based on `JWT_EXPIRES_IN` setting

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database connection
│   ├── controllers/     # Request handlers
│   │   ├── authController.ts
│   │   ├── vendorController.ts
│   │   ├── studentController.ts
│   │   ├── productController.ts
│   │   ├── orderController.ts
│   │   ├── announcementController.ts
│   │   └── eventController.ts
│   ├── middleware/      # Auth (protect/restrictTo), validation, multer upload
│   ├── models/          # Mongoose schemas
│   │   ├── User.ts
│   │   ├── VendorProfile.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   ├── Announcement.ts
│   │   └── Event.ts
│   ├── routes/          # API route definitions
│   │   ├── auth.ts
│   │   ├── vendor.ts
│   │   ├── student.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── announcements.ts
│   │   └── events.ts
│   ├── types/           # TypeScript type extensions (Express Request)
│   └── utils/           # notify.ts (Firebase Admin push), email helpers
├── server.ts            # Express app entry point
├── .env                 # Environment variables (not committed)
├── package.json
├── tsconfig.json
└── test.http            # REST Client test file
```

## 🧪 Testing Endpoints

### Using VS Code REST Client

1. Install "REST Client" extension by Huachao Mao
2. Open `test.http` file
3. Click "Send Request" above each endpoint

### Example: Register Student

```http
POST http://localhost:5000/api/auth/register/student
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "university": "MIT"
}
```

### Example: Login

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

## 🔒 Rate Limiting

- **General API:** 200 requests per 15 minutes
- **Login:** 20 requests per 15 minutes
- **Forgot Password:** 20 requests per 15 minutes

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Valid email required"
    }
  ]
}
```

## 📦 Dependencies

### Core
- `express` - Web framework
- `typescript` - Type safety
- `mongoose` - MongoDB ORM

### Authentication
- `jsonwebtoken` - JWT generation
- `bcryptjs` - Password hashing
- `google-auth-library` - Google OAuth

### Security & Middleware
- `helmet` - HTTP headers security
- `cors` - Cross-origin resource sharing
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `morgan` - HTTP request logging

### Storage & Email
- `cloudinary` - Image storage
- `multer` - File upload handling
- `nodemailer` - Email service

### Notifications
- `firebase-admin` - Push notifications via FCM

### Development
- `tsx` - TypeScript executor
- `nodemon` - Auto-reload
- `ts-node` - TypeScript runner

## 🐛 Troubleshooting

### Port 5000 Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9    # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process  # Windows
```

### MongoDB Connection Error
- Verify `MONGO_URI` in `.env`
- Check network access in MongoDB Atlas
- Ensure firewall allows connection

### Cloudinary Upload Fails
- Verify API credentials in `.env`
- Check image file size (max 10MB)
- Confirm Cloudinary account is active

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing key | Any random string |
| `JWT_EXPIRES_IN` | Token expiration | `1d`, `7d` |
| `NODE_ENV` | Environment | `development`, `production` |
| `CLIENT_ORIGIN` | Frontend URL for CORS | `http://localhost:3000` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (stringified) | `{"type":"service_account",...}` |

## 📄 License

MIT

## 👥 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss proposed changes.

---

**For frontend integration:** See the main [Campus Fair README](../README.md)
