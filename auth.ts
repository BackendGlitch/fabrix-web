import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

import { ROUTES } from './lib/routes';
import {
  getAccessTokenExpiry,
  loginWithBackend,
  logoutFromBackend,
  refreshWithBackend,
  type UserRole,
} from './lib/server/auth/backend';

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
};

function isAuthenticatedUser(user: unknown): user is AuthenticatedUser {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const candidate = user as Partial<AuthenticatedUser>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.role === 'string'
    && typeof candidate.accessToken === 'string'
    && typeof candidate.refreshToken === 'string'
    && typeof candidate.accessTokenExpires === 'number'
  );
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken || typeof token.refreshToken !== 'string') {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }

  try {
    const refreshed = await refreshWithBackend(token.refreshToken);

    return {
      ...token,
      user: refreshed.user,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpires: getAccessTokenExpiry(refreshed.accessToken),
      error: undefined,
    };
  } catch {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: ROUTES.auth.login,
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? credentials.email : '';
        const password =
          typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          return null;
        }

        try {
          const response = await loginWithBackend(email, password);
          return {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            accessTokenExpires: getAccessTokenExpiry(response.accessToken),
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (isAuthenticatedUser(user)) {
        return {
          ...token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: user.accessTokenExpires,
          error: undefined,
        };
      }

      if (
        !token.accessToken
        || typeof token.accessToken !== 'string'
        || typeof token.accessTokenExpires !== 'number'
      ) {
        return token;
      }

      const expiresInMs = token.accessTokenExpires - Date.now();
      if (expiresInMs > 60 * 1000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          id: token.user.id,
          email: token.user.email,
          name: token.user.name,
          role: token.user.role,
        };
      }

      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if (!('token' in message)) {
        return;
      }

      const refreshToken = message.token?.refreshToken;
      if (typeof refreshToken !== 'string') {
        return;
      }

      try {
        await logoutFromBackend(refreshToken);
      } catch {
        // Ignore backend logout failures so local sign-out still succeeds.
      }
    },
  },
});
