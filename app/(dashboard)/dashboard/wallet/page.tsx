"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const WalletContent = dynamic(() => import("./wallet-content"), {
  ssr: false,
});

function WalletFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<WalletFallback />}>
      <WalletContent />
    </Suspense>
  );
}
