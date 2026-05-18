import 'server-only';

import { auth } from '@/auth';

function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error('Missing API_URL or NEXT_PUBLIC_API_URL');
  }
  return base.replace(/\/$/, '');
}

async function ownerFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Missing authenticated owner access token');
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

export const OWNER_API_SESSION_REJECTED =
  'The API rejected your session (invalid or expired token). Sign out and sign in again. ';

export function isOwnerApiSessionRejectedError(e: unknown): boolean {
  return e instanceof Error && e.message === OWNER_API_SESSION_REJECTED;
}

// Types
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

// Get printer config for an agent
export async function getPrinterConfig(agentId: string): Promise<PrinterConfig | null> {
  try {
    const response = await ownerFetch(`/pricing/owner/agents/${agentId}/config`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(OWNER_API_SESSION_REJECTED);
      }
      throw new Error('Failed to load printer configuration');
    }
    const data = await response.json();
    return data.data;
  } catch (e) {
    throw e;
  }
}

// Create or update printer config
export async function savePrinterConfig(
  agentId: string,
  config: Partial<PrinterConfig>,
): Promise<PrinterConfig> {
  const response = await ownerFetch(`/pricing/owner/agents/${agentId}/config`, {
    method: 'POST',
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to save printer configuration');
  }

  const data = await response.json();
  return data.data;
}

// Get filaments for a printer
export async function getFilaments(printerConfigId: string): Promise<Filament[]> {
  const response = await ownerFetch(`/pricing/filaments/${printerConfigId}`);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    throw new Error('Failed to load filaments');
  }

  const data = await response.json();
  return data.data;
}

// Add filament to printer
export async function addFilament(
  printerConfigId: string,
  filament: Omit<Filament, 'id' | 'printerConfigId'>,
): Promise<Filament> {
  const response = await ownerFetch(
    `/pricing/owner/printers/${printerConfigId}/filaments`,
    {
      method: 'POST',
      body: JSON.stringify(filament),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to add filament');
  }

  const data = await response.json();
  return data.data;
}

// Update filament
export async function updateFilament(
  printerConfigId: string,
  filamentId: string,
  updates: Partial<Filament>,
): Promise<Filament> {
  const response = await ownerFetch(
    `/pricing/owner/printers/${printerConfigId}/filaments/${filamentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to update filament');
  }

  const data = await response.json();
  return data.data;
}

// Delete filament
export async function deleteFilament(
  printerConfigId: string,
  filamentId: string,
): Promise<void> {
  const response = await ownerFetch(
    `/pricing/owner/printers/${printerConfigId}/filaments/${filamentId}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    throw new Error('Failed to delete filament');
  }
}

// Get filament standards
export async function getFilamentStandards(): Promise<FilamentStandard[]> {
  const response = await ownerFetch('/pricing/filament-standards');

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(OWNER_API_SESSION_REJECTED);
    }
    throw new Error('Failed to load filament standards');
  }

  const data = await response.json();
  return data.data;
}
