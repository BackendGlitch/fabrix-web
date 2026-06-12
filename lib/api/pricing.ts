// Pricing API client

import { getSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || "https://api-fabrix-v2.backendglitch.com";

interface PrintSettings {
  infillPercent?: number;
  layerHeight?: string;
  wallCount?: number;
  supportEnabled?: boolean;
}

interface CalculatePriceRequest {
  fileId: string;
  printerConfigId?: string;
  filamentId?: string;
  scale?: number;
  quantity?: number;
  printSettings?: PrintSettings;
}

interface PricingBreakdown {
  modelVolumeCm3: number;
  boundingBoxVolumeCm3: number;
  boundingBox: {
    width: number;
    height: number;
    depth: number;
  };
  filamentVolumeCm3: number;
  filamentWeightGrams: number;
  estimatedPrintTimeMinutes: number;
  filamentCost: number;
  machineTimeCost: number;
  supportMaterialCost: number;
  platformFee: number;
  totalPrice: number;
  filamentType: string;
  filamentColor: string;
  currency: 'TND'; // Tunisian Dinar
  fitsOnBed: boolean;
  scaleToFit?: number;
}

interface BatchCalculationResult {
  quantity: number;
  fitsOnBed: boolean;
  arrangements: {
    x: number;
    y: number;
    rotation: number;
  }[];
  totalFilamentWeightGrams: number;
  totalPrintTimeMinutes: number;
  totalPrice: number;
  pricePerItem: number;
  recommendedScale: number;
}

interface FilamentOption {
  id: string;
  type: string;
  brand: string | null;
  color: string;
  colorHex: string | null;
  pricePerGram: string;
  stockGrams: number | null;
  nozzleTemp: number | null;
  bedTemp: number | null;
  printSpeed: number | null;
  density: number;
}

interface FilamentStandard {
  id: string;
  type: string;
  name: string;
  density: string;
  defaultNozzleTemp: number;
  defaultBedTemp: number;
  defaultPrintSpeed: number;
  color: string | null;
  description: string | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.accessToken;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Calculate price for a single print job
 */
export async function calculatePrice(
  request: CalculatePriceRequest,
): Promise<PricingBreakdown> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/pricing/calculate`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to calculate price");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Calculate batch price for multiple copies
 */
export async function calculateBatchPrice(
  request: CalculatePriceRequest,
): Promise<BatchCalculationResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/pricing/calculate-batch`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to calculate batch price");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a price quote (valid for a limited time)
 */
export async function createQuote(
  request: CalculatePriceRequest,
  expiresInMinutes = 60,
): Promise<{ quoteId: string; expiresIn: string }> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/quote?expiresInMinutes=${expiresInMinutes}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create quote");
  }

  return response.json();
}

/**
 * Get available filaments for a printer
 */
export async function getAvailableFilaments(
  printerConfigId: string,
): Promise<FilamentOption[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/filaments/${printerConfigId}`,
    {
      headers,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch filaments");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get filament standards (platform defaults)
 */
export async function getFilamentStandards(): Promise<FilamentStandard[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/pricing/filament-standards`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch filament standards");
  }

  const data = await response.json();
  return data.data;
}

// Export types
export type {
  PrintSettings,
  CalculatePriceRequest,
  PricingBreakdown,
  BatchCalculationResult,
  FilamentOption,
  FilamentStandard,
};
