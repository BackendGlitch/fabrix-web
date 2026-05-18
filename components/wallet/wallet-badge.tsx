"use client";

import { useEffect, useState } from "react";
import { getWallet } from "@/lib/api/wallet";
import { Wallet } from "lucide-react";

export default function WalletBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function loadBalance() {
      try {
        const wallet = await getWallet();
        setBalance(wallet.balance);
      } catch {
        // silently fail
      }
    }

    loadBalance();
    // Poll every 5 seconds for updates
    interval = setInterval(loadBalance, 5000);

    return () => clearInterval(interval);
  }, []);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
      <Wallet className="w-4 h-4" />
      <span>{balance} TND</span>
    </div>
  );
}
