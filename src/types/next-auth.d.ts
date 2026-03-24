import { NextAuthOptions, DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'USER' | 'AGENT' | 'AGENCY' | 'ADMIN' | 'SUPER_ADMIN';
      name?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
  }
}
