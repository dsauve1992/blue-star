// Kinde Configuration
// Replace these values with your actual Kinde application settings

export const kindeConfig = {
  clientId: import.meta.env.VITE_KINDE_CLIENT_ID,
  domain: import.meta.env.VITE_KINDE_DOMAIN,
  redirectUri: import.meta.env.VITE_KINDE_REDIRECT_URI,
  logoutUri: import.meta.env.VITE_KINDE_LOGOUT_URI,
};
