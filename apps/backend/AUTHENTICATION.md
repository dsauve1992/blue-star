# Authentication Setup with Kinde

This backend now includes JWT authentication using Kinde. All routes are protected by default unless marked with the `@Public()` decorator.

## Setup

1. **Create a Kinde account** at [https://kinde.com/](https://kinde.com/)

2. **Create a new application** in your Kinde dashboard

3. **Set up environment variables** by creating a `.env` file in the backend directory:

```bash
# Kinde Configuration
KINDE_DOMAIN=your-domain.kinde.com
KINDE_CLIENT_ID=your-client-id
KINDE_CLIENT_SECRET=your-client-secret
KINDE_REDIRECT_URL=http://localhost:3000/auth/callback
KINDE_LOGOUT_REDIRECT_URL=http://localhost:3000
```

4. **Install dependencies** (already done):
```bash
npm install @kinde-oss/kinde-typescript-sdk @nestjs/jwt @nestjs/passport passport passport-jwt @types/passport-jwt
```

## How it works

### Global Authentication
- All routes are protected by default
- Use `@Public()` decorator to make routes accessible without authentication
- The `AuthGuard` is configured globally in `app.module.ts`

### JWT Strategy
- Uses Kinde's TypeScript SDK for JWT verification
- Extracts user information from the JWT token
- Provides user context to protected routes
- Full TypeScript support with proper type definitions

### Available Decorators
- `@CurrentUser()` - Get the authenticated user in your controller methods
- `@Public()` - Mark routes as public (no authentication required)

## Testing

### Public Endpoints
```bash
# Test public endpoint
curl http://localhost:3000/auth/test
curl http://localhost:3000/
```

### Protected Endpoints
```bash
# Test protected endpoint (requires valid JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/auth/profile
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/auth/test
```

### Position Endpoints
```bash
# Create a position (requires authentication)
curl -X POST http://localhost:3000/positions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioId": "portfolio-123",
    "instrument": "AAPL",
    "quantity": 100,
    "price": 150.50,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "note": "Test position"
  }'
```

## Architecture

The authentication system follows Clean Architecture principles:

- **Domain Layer**: `AuthContext` interface for user context
- **Application Layer**: Use cases receive `AuthContext` with user information
- **Infrastructure Layer**: Kinde service handles JWT verification
- **API Layer**: Controllers use `@CurrentUser()` decorator to access user data

## Security Features

- JWT tokens are verified using Kinde's TypeScript SDK
- User information is extracted and validated with full type safety
- All routes are protected by default
- Public routes are explicitly marked
- User context is passed to use cases for authorization
- TypeScript types ensure compile-time safety

## Next Steps

1. Configure your Kinde application settings
2. Set up the frontend authentication flow
3. Implement role-based access control if needed
4. Add user permissions to the domain layer
