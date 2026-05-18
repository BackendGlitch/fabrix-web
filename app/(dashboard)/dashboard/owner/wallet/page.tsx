"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getWallet, getTransactions, createPayout, type Wallet, type Transaction } from "@/lib/api/wallet";
import toast from "react-hot-toast";
import { CreditCard, Plus, Minus, History, Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export default function OwnerWalletPage() {
  const { data: session } = useSession();
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
        return <Plus className="w-4 h-4 text-green-500" />;
      case "payment":
        return <Minus className="w-4 h-4 text-red-500" />;
      case "payout":
        return <ArrowDownLeft className="w-4 h-4 text-blue-500" />;
      case "refund":
        return <Plus className="w-4 h-4 text-green-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: Transaction["type"]) => {
    switch (type) {
      case "topup":
      case "refund":
        return "text-green-600";
      case "payment":
        return "text-red-600";
      case "payout":
        return "text-blue-600";
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
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-gray-600">View your earnings and manage withdrawals</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm mb-1">Available Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{wallet?.balance || 0}</span>
              <span className="text-xl">TND</span>
            </div>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <WalletIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-green-100 text-sm mt-4">1 Credit = 1 TND</p>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-green-600" />
          Withdraw Earnings
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setWithdrawAmount(amount)}
              className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                withdrawAmount === amount
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
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
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank RIB or Wallet Address
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter your bank RIB or wallet address"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || withdrawAmount <= 0 || !destination}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isWithdrawing ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Withdrawals are processed securely via NexaPay. Minimum withdrawal: 10 TND.
        </p>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-green-600" />
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
            <p className="text-sm text-gray-400">Complete print jobs to earn credits!</p>
          </div>
        )}
      </div>
    </div>
  );
}
