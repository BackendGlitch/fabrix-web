"use client";

import { useState, useEffect } from "react";
import { getWallet, createPayout, type Wallet, type Transaction } from "@/lib/api/wallet";
import toast from "react-hot-toast";
import { CreditCard, Plus, Minus, History, Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Landmark, Loader2 } from "lucide-react";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export default function OwnerWalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [destination, setDestination] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (error) {
      console.error("Failed to load wallet:", error);
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!destination || destination.length < 5) {
      toast.error("Please enter a valid bank RIB or wallet address");
      return;
    }
    if ((wallet?.balance || 0) < withdrawAmount) {
      toast.error(`Insufficient balance. Available: ${wallet?.balance || 0} TND`);
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await createPayout(withdrawAmount, destination);
      toast.success(`Withdrawal of ${withdrawAmount} TND initiated! Status: ${result.data.status}`);
      await loadWallet();
      setDestination("");
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to withdraw");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
        return <Plus className="w-4 h-4 text-lime" />;
      case "payment":
        return <Minus className="w-4 h-4 text-destructive" />;
      case "payout":
        return <ArrowDownLeft className="w-4 h-4 text-primary" />;
      case "refund":
        return <Plus className="w-4 h-4 text-lime" />;
      default:
        return <CreditCard className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
      case "refund":
        return "text-lime";
      case "payment":
        return "text-destructive";
      case "payout":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter-hero leading-[0.95] mb-2">
          My <span className="slant-highlight slant-highlight-lime text-black">Earnings</span>
        </h1>
        <p className="text-muted-foreground">View your earnings and manage withdrawals</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-lime/80 to-primary/80 rounded-2xl p-6 text-primary-foreground mb-8 border border-lime/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/70 text-sm mb-1">Available Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{wallet?.balance || 0}</span>
              <span className="text-xl">TND</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-full p-3 backdrop-blur-sm border border-white/20">
            <WalletIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-primary-foreground/70 text-sm mt-4">1 Credit = 1 TND</p>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-lime" />
          Withdraw Earnings
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setWithdrawAmount(amount)}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
                withdrawAmount === amount
                  ? "border-lime bg-lime/10 text-lime"
                  : "border-border hover:border-lime/50 hover:bg-secondary"
              }`}
            >
              {amount} TND
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Custom Amount (TND)
            </label>
            <input
              type="number"
              min="1"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-lime focus:border-lime text-foreground"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Bank RIB or Wallet Address
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter your bank RIB or wallet address"
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-lime focus:border-lime text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || withdrawAmount <= 0 || !destination}
              className="px-6 py-2 bg-lime text-lime-foreground rounded-xl hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {isWithdrawing ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Withdrawals are processed securely via NexaPay. Minimum withdrawal: 10 TND.
        </p>
      </div>

      {/* Transaction History */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-lime" />
          Transaction History
        </h2>

        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="space-y-3">
            {wallet.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-secondary rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-card rounded-full p-2 border border-border">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.description || transaction.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount} TND
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {transaction.balanceAfter} TND
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground/70">Complete print jobs to earn credits!</p>
          </div>
        )}
      </div>
    </div>
  );
}
