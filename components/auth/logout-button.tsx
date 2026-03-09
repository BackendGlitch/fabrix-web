'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ROUTES } from '@/lib/routes';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await signOut({ redirectTo: ROUTES.auth.login });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-60"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
