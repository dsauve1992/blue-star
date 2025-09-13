import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { apiClient } from 'src/api/api-instance';

interface TokenProviderSetupProps {
  children: React.ReactNode;
}

export function TokenProviderSetup({ children }: TokenProviderSetupProps) {
  const { isAuthenticated, getToken } = useKindeAuth();

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.setTokenProvider(async () => {
        try {
          const token = await getToken();
          return token || null;
        } catch (error) {
          console.error('Failed to get authentication token:', error);
          return null;
        }
      });
    }
  }, [isAuthenticated, getToken]);

  return <>{children}</>;
}
