# MelikShop Backend

A comprehensive Node.js backend API for an e-commerce platform built with Express.js, TypeScript, MongoDB, and JWT authentication.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with JWT tokens
- 📧 **Email Services** - Email verification and password reset using Nodemailer
- 🖼️ **File Upload** - Image upload capabilities using Multer
- ✅ **Input Validation** - Server-side validation using Zod
- 🔒 **Security** - bcrypt password hashing, CORS, Helmet, rate limiting
- 📊 **Database** - MongoDB with Mongoose for data modeling
- 🛡️ **Error Handling** - Comprehensive error handling middleware
- 📝 **TypeScript** - Full TypeScript support with strict typing

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Zod
- **Security**: Helmet, CORS, express-rate-limit

## Prerequisites

- Node.js 18 or higher
- MongoDB (local or cloud instance)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd melikshop-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/melikshop

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com

   # Client URL (for CORS)
   CLIENT_URL=http://localhost:3000

   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project for production
- `npm start` - Start production server
- `npm test` - Run tests (to be implemented)

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/verify-email` | Verify email address | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |
| GET | `/me` | Get current user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| PUT | `/change-password` | Change password | Yes |
| POST | `/resend-verification` | Resend email verification | Yes |
| POST | `/logout` | Logout user | Yes |

### User Management Routes (`/api/users`) - Admin Only

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all users | Admin |
| GET | `/:id` | Get user by ID | Admin |
| PUT | `/:id` | Update user | Admin |
| DELETE | `/:id` | Delete user | Admin |
| PATCH | `/:id/toggle-status` | Toggle user status | Admin |
| GET | `/stats/overview` | Get user statistics | Admin |

### Product Routes (`/api/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all products | No |
| GET | `/:id` | Get product by ID | No |
| POST | `/` | Create product | Admin |
| PUT | `/:id` | Update product | Admin |
| DELETE | `/:id` | Delete product | Admin |
| PATCH | `/:id/toggle-status` | Toggle product status | Admin |
| PATCH | `/:id/toggle-featured` | Toggle featured status | Admin |
| POST | `/:id/reviews` | Add product review | Yes |
| GET | `/categories/list` | Get product categories | No |
| GET | `/brands/list` | Get product brands | No |
| GET | `/featured/list` | Get featured products | No |
| GET | `/stats/overview` | Get product statistics | Admin |

### File Upload Routes (`/api/upload`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/single` | Upload single file | Yes |
| POST | `/multiple` | Upload multiple files | Yes |
| POST | `/fields` | Upload specific field types | Yes |
| DELETE | `/:filename` | Delete uploaded file | Yes |
| GET | `/:filename/info` | Get file info | Yes |
| GET | `/list/:field` | List uploaded files | Admin |
| DELETE | `/bulk/:field` | Bulk delete files | Admin |

## Database Models

### User Model
```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  avatar?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Product Model
```typescript
{
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  thumbnail: string;
  stock: number;
  sku: string;
  tags: string[];
  specifications?: Record<string, any>;
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## File Upload

The API supports file uploads with the following features:

- **Supported formats**: JPEG, PNG, GIF, WebP
- **Maximum file size**: 5MB (configurable)
- **Maximum files**: 10 files per request
- **Storage**: Local file system with organized directory structure

### Upload Examples

**Single file upload:**
```bash
curl -X POST http://localhost:3000/api/upload/single \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg"
```

**Multiple files upload:**
```bash
curl -X POST http://localhost:3000/api/upload/multiple \
  -H "Authorization: Bearer <token>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Validation

All input is validated using Zod schemas with comprehensive error messages for:

- Email format validation
- Password strength requirements
- File type and size validation
- Required field validation
- Data type validation

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Comprehensive input sanitization
- **JWT Security**: Secure token generation and verification

## Email Services

The API includes email functionality for:

- Welcome emails with verification links
- Password reset emails
- Email verification reminders
- Order confirmation emails

Configure your email settings in the `.env` file.

## Development

### Project Structure
```
src/
├── index.ts                 # Main application entry point
├── models/                  # Database models
│   ├── user.model.ts
│   └── product.model.ts
├── routes/                  # API routes
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── product.routes.ts
│   └── upload.routes.ts
├── middleware/              # Custom middleware
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   └── error.middleware.ts
├── services/                # Business logic services
│   ├── email.service.ts
│   └── upload.service.ts
├── utils/                   # Utility functions
│   └── jwt.utils.ts
└── validations/             # Input validation schemas
    ├── auth.validation.ts
    └── product.validation.ts
```

### Environment Variables

Make sure to configure all required environment variables in your `.env` file. See the `env.example` file for the complete list.

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set environment variables** for production

3. **Start the server:**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository. 