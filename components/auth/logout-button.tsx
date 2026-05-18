'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ROUTES } from '@/lib/routes';
import { LogOut } from 'lucide-react';

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
      title="Logout"
      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
