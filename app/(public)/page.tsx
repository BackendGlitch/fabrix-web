'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { LandingPage } from '@/components/layout/landing-page';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.replace(ROUTES.dashboard);
    }
  }, [session, router]);

  // Show landing page for unauthenticated users
  return <LandingPage />;
}
