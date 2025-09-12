import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import { kindeConfig } from "./config/kinde.config";

interface AuthProviderProps {
  children: React.ReactNode;
}

console.log("Kinde Config:", kindeConfig);

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <KindeProvider
      clientId={kindeConfig.clientId}
      domain={kindeConfig.domain}
      redirectUri={kindeConfig.redirectUri}
      logoutUri={kindeConfig.logoutUri}
      useInsecureForRefreshToken={import.meta.env.NODE_ENV === "development"}
    >
      {children}
    </KindeProvider>
  );
}
