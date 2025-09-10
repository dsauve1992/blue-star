export const kindeConfig = {
  domain: process.env.KINDE_DOMAIN || 'your-domain.kinde.com',
  clientId: process.env.KINDE_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.KINDE_CLIENT_SECRET || 'your-client-secret',
  redirectURL:
    process.env.KINDE_REDIRECT_URL || 'http://localhost:3000/auth/callback',
  logoutRedirectURL:
    process.env.KINDE_LOGOUT_REDIRECT_URL || 'http://localhost:3000',
};
