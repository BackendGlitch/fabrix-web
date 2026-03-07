'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // If logged in, go to dashboard
        router.push('/dashboard');
      } else {
        // If not logged in, go to login
        router.push('/auth/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-gray-600">Redirecting...</p>
    </div>
  );
}