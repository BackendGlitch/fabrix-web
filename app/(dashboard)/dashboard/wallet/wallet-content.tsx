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
        return <Plus className="w-4 h-4 text-green-500" />;
      case "payment":
        return <Minus className="w-4 h-4 text-red-500" />;
      case "payout":
        return <Plus className="w-4 h-4 text-blue-500" />;
      case "refund":
        return <Plus className="w-4 h-4 text-green-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
      case "payout":
      case "refund":
        return "text-green-600";
      case "payment":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="text-gray-600">Manage your credits for 3D printing</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">Current Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{wallet?.balance || 0}</span>
              <span className="text-xl">TND</span>
            </div>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <WalletIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-4">1 Credit = 1 TND</p>
      </div>

      {/* Top Up Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Top Up Credits
        </h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setTopUpAmount(amount)}
              className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                topUpAmount === amount
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              {amount} TND
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Amount (TND)
            </label>
            <input
              type="number"
              min="1"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={handleCreatePayment}
              disabled={isToppingUp || pollingPayment || topUpAmount <= 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isToppingUp ? "Redirecting..." : pollingPayment ? "Waiting..." : "Proceed to Payment"}
            </button>
          </div>
        </div>

        {/* Redirecting state */}
        {isToppingUp && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-900">Opening secure checkout...</span>
            </div>
            <p className="text-sm text-blue-600 text-center mt-2">
              NexaPay checkout is opening in a new tab.
            </p>
          </div>
        )}

        {/* Polling state */}
        {pollingPayment && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              <span className="font-medium text-amber-900">Waiting for payment...</span>
            </div>
            <p className="text-sm text-amber-700 text-center mt-2">
              Please complete your payment in the NexaPay tab. This page will update automatically.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          Payments are processed securely via NexaPay. 1 Credit = 1 TND.
        </p>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Transaction History
        </h2>

        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="space-y-3">
            {wallet.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-full p-2">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || transaction.type}
                    </p>
                    <p className="text-sm text-gray-500">
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
                  <p className="text-sm text-gray-500">
                    Balance: {transaction.balanceAfter} TND
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400">Top up to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
