import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      organizationId: string;
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
    };
  }
  interface User {
    role?: string;
    organizationId?: string;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    userId?: string;
    organizationId?: string;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}
