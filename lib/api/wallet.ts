import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Helper function to get auth token from session
async function getAuthToken(): Promise<string | undefined> {
  const session = await getSession();
  return session?.accessToken as string | undefined;
}

export interface Wallet {
  balance: number;
  user: {
    id: string;
    name: string;
    email: string;
    credits: number;
  };
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: "topup" | "payment" | "refund" | "payout" | "platform_fee";
  amount: number;
  balanceAfter: number;
  description: string | null;
  jobId: string | null;
  createdAt: string;
}

export interface BalanceCheck {
  hasEnough: boolean;
  requiredAmount: number;
  availableBalance: number;
  shortfall: number;
}

export async function getWallet(): Promise<Wallet> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch wallet");
  }

  const result = await response.json();
  return result;
}

export async function getTransactions(limit?: number): Promise<Transaction[]> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const url = new URL(`${API_URL}wallet/transactions`);
  if (limit) url.searchParams.append("limit", limit.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch transactions");
  }

  const result = await response.json();
  return result;
}

export interface PaymentIntent {
  intentId: string;
  clientSecret: string;
  status: string;
  payUrl: string;
  amount: number;
}

export async function createPaymentIntent(amount: number): Promise<{ success: boolean; message: string; data: PaymentIntent }> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet/create-intent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, description: `Top up ${amount} TND credits` }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create payment intent");
  }

  return response.json();
}

export async function confirmPayment(intentId: string): Promise<{ success: boolean; message: string; data: { amount: number; newBalance: number } }> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet/confirm-payment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ intentId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to confirm payment");
  }

  return response.json();
}

export async function createPayout(amount: number, destination: string): Promise<{ success: boolean; message: string; data: { payoutId: string; status: string; amount: number } }> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet/payout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, destination }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create payout");
  }

  return response.json();
}

export async function payForJob(jobId: string, amount: number): Promise<{ success: boolean; message: string; data: { amount: number; newBalance: number; transactionId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet/pay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId, amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to pay for job");
  }

  return response.json();
}

export async function checkBalance(amount: number): Promise<BalanceCheck> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}wallet/check-balance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to check balance");
  }

  return response.json();
}
