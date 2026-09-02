export const kindeConfig = {
  clientId: import.meta.env.VITE_KINDE_CLIENT_ID,
  domain: import.meta.env.VITE_KINDE_DOMAIN,
  redirectUri: window.location.origin,
  logoutUri: window.location.origin,
  audience: import.meta.env.VITE_KINDE_AUDIENCE,
};
