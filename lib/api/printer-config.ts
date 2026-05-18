// Client-side printer configuration API

import { getSession } from 'next-auth/react';

const API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || 'http://localhost:4000';

export interface PrinterConfig {
  id: string;
  agentId: string;
  bedWidth: number;
  bedDepth: number;
  bedHeight: number;
  nozzleDiameter: string;
  hourlyRate: string;
  defaultLayerHeight: string;
  defaultInfillPercent: number;
  defaultWallCount: number;
  supportsMultiMaterial: boolean;
  hasHeatedBed: boolean;
  maxNozzleTemp: number;
  maxBedTemp: number;
  isActive: boolean;
}

export interface Filament {
  id: string;
  printerConfigId: string;
  type: string;
  brand: string | null;
  color: string;
  colorHex: string | null;
  pricePerGram: string;
  stockGrams: number | null;
  nozzleTemp: number | null;
  bedTemp: number | null;
  printSpeed: number | null;
  isAvailable: boolean;
  notes: string | null;
}

export interface FilamentStandard {
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
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Save printer configuration for an agent
 */
export async function savePrinterConfig(
  agentId: string,
  config: Partial<PrinterConfig>,
): Promise<PrinterConfig> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/owner/agents/${agentId}/config`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save printer configuration');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get printer configuration for an agent
 */
export async function getPrinterConfig(agentId: string): Promise<PrinterConfig | null> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/owner/agents/${agentId}/config`,
    {
      headers,
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to load printer configuration');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get available filaments for a printer
 */
export async function getFilaments(printerConfigId: string): Promise<Filament[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/filaments/${printerConfigId}`,
    {
      headers,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to load filaments');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Add filament to printer inventory
 */
export async function addFilament(
  printerConfigId: string,
  filament: Omit<Filament, 'id' | 'printerConfigId' | 'isAvailable'>,
): Promise<Filament> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/owner/printers/${printerConfigId}/filaments`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(filament),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add filament');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update filament
 */
export async function updateFilament(
  printerConfigId: string,
  filamentId: string,
  updates: Partial<Filament>,
): Promise<Filament> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/owner/printers/${printerConfigId}/filaments/${filamentId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update filament');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete filament
 */
export async function deleteFilament(
  printerConfigId: string,
  filamentId: string,
): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE}/pricing/owner/printers/${printerConfigId}/filaments/${filamentId}`,
    {
      method: 'DELETE',
      headers,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete filament');
  }
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
    throw new Error(error.message || 'Failed to load filament standards');
  }

  const data = await response.json();
  return data.data;
}
