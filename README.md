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

- **Vendor Management**
  - Create and manage vendor profiles
  - Photo uploads to Cloudinary
  - Gallery management
  - Contact & delivery information
  - Bank details for payments

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
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password/:token` | Reset password with token |

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
| PUT | `/profile/delivery` | Update delivery settings (vendor only) |
| PUT | `/profile/bank` | Update bank details (vendor only) |
| GET | `/:userId/profile` | Get public vendor profile |
| POST | `/save` | Save vendor (student only) |

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
│   ├── config/          # Database & configuration
│   ├── controllers/     # Request handlers
│   │   ├── authController.ts
│   │   └── vendorController.ts
│   ├── middleware/      # Auth, validation, upload handlers
│   ├── models/          # Mongoose schemas
│   │   ├── User.ts
│   │   └── VendorProfile.ts
│   ├── routes/          # API route definitions
│   │   ├── auth.ts
│   │   └── vendor.ts
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── server.ts            # Express app setup
├── .env                 # Environment variables
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

## 📄 License

MIT

## 👥 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss proposed changes.

---

**For frontend integration:** See the main [Campus Fair README](../README.md)
