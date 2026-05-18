"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getWallet, createPaymentIntent, confirmPayment, type Wallet, type Transaction } from "@/lib/api/wallet";
import toast from "react-hot-toast";
import { CreditCard, Plus, Minus, History, Wallet as WalletIcon, Loader2 } from "lucide-react";

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

export default function WalletContent() {
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [pollingPayment, setPollingPayment] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (error) {
      console.error("Failed to load wallet:", error);
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkReturnPayment = useCallback(async () => {
    const intentId = searchParams.get("intent_id");
    const status = searchParams.get("status");

    if (intentId) {
      if (status === "succeeded") {
        // Try to confirm payment directly (in case webhook hasn't fired yet)
        try {
          toast.loading("Confirming payment...");
          const result = await confirmPayment(intentId);
          toast.dismiss();
          toast.success(`Added ${result.data.amount} TND to your wallet!`);
          await loadWallet();
        } catch {
          // If confirm fails, webhook may handle it - just poll
          toast.dismiss();
          toast.success("Payment completed! Credits will be added shortly.");
          for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 2000));
            await loadWallet();
          }
        }
      } else if (status === "failed") {
        toast.error("Payment failed. Please try again.");
      }
      window.history.replaceState({}, "", "/dashboard/wallet");
      localStorage.removeItem('pending_payment_intent');
    }
  }, [searchParams, loadWallet]);

  useEffect(() => {
    loadWallet();
    checkReturnPayment();
  }, [loadWallet, checkReturnPayment]);

  const handleCreatePayment = async () => {
    if (topUpAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsToppingUp(true);
    try {
      const result = await createPaymentIntent(topUpAmount);
      const payUrl = result.data.payUrl;
      const intentId = result.data.intentId;
      
      if (payUrl && intentId) {
        // Open NexaPay checkout in new tab
        window.open(payUrl, '_blank');
        setPendingIntent(intentId);
        
        // Start polling for payment completion
        toast.success("Checkout opened in new tab. Waiting for payment...");
        setIsToppingUp(false);
        setPollingPayment(true);
        
        // Poll every 3 seconds for up to 2 minutes
        let attempts = 0;
        const maxAttempts = 40;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const confirmResult = await confirmPayment(intentId);
            if (confirmResult.success) {
              clearInterval(pollInterval);
              setPollingPayment(false);
              setPendingIntent(null);
              toast.success(`Added ${confirmResult.data.amount} TND to your wallet!`);
              await loadWallet();
              return;
            }
          } catch {
            // Payment not confirmed yet, keep polling
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPollingPayment(false);
            toast.error("Payment confirmation timed out. Please refresh the page later.");
          }
        }, 3000);
      } else {
        toast.error("No checkout URL received from payment gateway");
      }
    } catch (error) {
      console.error("Failed to create payment intent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment");
      setIsToppingUp(false);
    }
  };

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
        return <Plus className="w-4 h-4 text-lime" />;
      case "payment":
        return <Minus className="w-4 h-4 text-destructive" />;
      case "payout":
        return <Plus className="w-4 h-4 text-primary" />;
      case "refund":
        return <Plus className="w-4 h-4 text-lime" />;
      default:
        return <CreditCard className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
      case "payout":
      case "refund":
        return "text-lime";
      case "payment":
        return "text-destructive";
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
          My <span className="slant-highlight slant-highlight-cyan text-black">Wallet</span>
        </h1>
        <p className="text-muted-foreground">Manage your credits for 3D printing</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary/80 to-magenta/80 rounded-2xl p-6 text-primary-foreground mb-8 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/70 text-sm mb-1">Current Balance</p>
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

      {/* Top Up Section */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Top Up Credits
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setTopUpAmount(amount)}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
                topUpAmount === amount
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-secondary"
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
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={handleCreatePayment}
              disabled={isToppingUp || pollingPayment || topUpAmount <= 0}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium glow-cyan"
            >
              {isToppingUp ? "Redirecting..." : pollingPayment ? "Waiting..." : "Proceed to Payment"}
            </button>
          </div>
        </div>

        {/* Redirecting state */}
        {isToppingUp && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="font-medium text-primary">Opening secure checkout...</span>
            </div>
            <p className="text-sm text-primary/70 text-center mt-2">
              NexaPay checkout is opening in a new tab.
            </p>
          </div>
        )}

        {/* Polling state */}
        {pollingPayment && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="font-medium text-amber-400">Waiting for payment...</span>
            </div>
            <p className="text-sm text-amber-400/70 text-center mt-2">
              Please complete your payment in the NexaPay tab. This page will update automatically.
            </p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Payments are processed securely via NexaPay. 1 Credit = 1 TND.
        </p>
      </div>

      {/* Transaction History */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
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
            <p className="text-sm text-muted-foreground/70">Top up to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
