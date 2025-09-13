import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import { kindeConfig } from "src/auth/config/kinde.config";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <KindeProvider
      clientId={kindeConfig.clientId}
      domain={kindeConfig.domain}
      redirectUri={kindeConfig.redirectUri}
      logoutUri={kindeConfig.logoutUri}
      audience={kindeConfig.audience}
      useInsecureForRefreshToken={import.meta.env.NODE_ENV === "development"}
    >
      {children}
    </KindeProvider>
  );
}
