"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <Suspense fallback={null}>
        {children}
      </Suspense>
      <Toaster position="top-right" />
    </SessionProvider>
  );
}
