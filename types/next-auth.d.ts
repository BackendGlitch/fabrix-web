import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@/lib/server/auth/backend';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: UserRole;
    };
    error?: 'RefreshAccessTokenError';
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: 'RefreshAccessTokenError';
  }
}
