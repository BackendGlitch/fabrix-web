'use client';

import { useState } from 'react';
import {
  Printer,
  Ruler,
  Thermometer,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Palette,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  savePrinterConfig,
  addFilament,
  updateFilament,
  deleteFilament,
  type PrinterConfig,
  type Filament,
  type FilamentStandard,
} from '@/lib/api/printer-config';

interface Agent {
  id: string;
  displayName: string;
  nodeId: string;
  status: string;
}

interface PrinterConfigManagerProps {
  agent: Agent;
  initialConfig?: PrinterConfig;
  initialFilaments: Filament[];
  filamentStandards: FilamentStandard[];
}

export function PrinterConfigManager({
  agent,
  initialConfig,
  initialFilaments,
  filamentStandards,
}: PrinterConfigManagerProps) {
  const [isExpanded, setIsExpanded] = useState(!initialConfig);
  const [config, setConfig] = useState<Partial<PrinterConfig>>(
    initialConfig ?? {
      bedWidth: 220,
      bedDepth: 220,
      bedHeight: 250,
      nozzleDiameter: '0.4',
      hourlyRate: '6.00',
      defaultLayerHeight: '0.2',
      defaultInfillPercent: 20,
      defaultWallCount: 3,
      supportsMultiMaterial: false,
      hasHeatedBed: true,
      maxNozzleTemp: 300,
      maxBedTemp: 110,
    },
  );
  const [filaments, setFilaments] = useState<Filament[]>(initialFilaments);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddFilament, setShowAddFilament] = useState(false);

  // Predefined filament colors
const FILAMENT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Beige', hex: '#F5DEB3' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Transparent', hex: '#E0E0E0' },
  { name: 'Natural', hex: '#FFF8DC' },
];

  // New filament form state - simplified
  const [newFilament, setNewFilament] = useState({
    type: 'PLA',
    color: '',
    colorHex: '#000000',
    stockGrams: '',
  });

  // Get auto-calculated price from standards
  const getAutoPrice = (type: string): string => {
    const standard = filamentStandards.find((s) => s.type === type);
    if (!standard) return '0.10';
    // Base price calculation: density * base rate (0.065 TND per density unit)
    const density = parseFloat(standard.density);
    const price = (density * 0.065).toFixed(2);
    return price;
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await savePrinterConfig(agent.id, config);
      toast.success('Printer configuration saved');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFilament = async () => {
    if (!initialConfig?.id) {
      toast.error('Save printer configuration first');
      return;
    }

    try {
      const autoPrice = getAutoPrice(newFilament.type);
      const filament = await addFilament(initialConfig.id, {
        type: newFilament.type,
        color: newFilament.color,
        colorHex: newFilament.colorHex,
        pricePerGram: autoPrice,
        stockGrams: newFilament.stockGrams
          ? parseInt(newFilament.stockGrams)
          : null,
        brand: null,
        nozzleTemp: null,
        bedTemp: null,
        printSpeed: null,
        notes: null,
      });
      setFilaments([...filaments, filament]);
      setShowAddFilament(false);
      setNewFilament({
        type: 'PLA',
        color: '',
        colorHex: '#000000',
        stockGrams: '',
      });
      toast.success('Filament added');
    } catch (error) {
      console.error('[AddFilament] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add filament';
      toast.error(`Failed to add filament: ${message}`);
    }
  };

  const handleDeleteFilament = async (filamentId: string) => {
    if (!initialConfig?.id) return;

    try {
      await deleteFilament(initialConfig.id, filamentId);
      setFilaments(filaments.filter((f) => f.id !== filamentId));
      toast.success('Filament removed');
    } catch (error) {
      console.error('Failed to delete filament:', error);
      toast.error('Failed to remove filament');
    }
  };

  const selectedStandard = filamentStandards.find(
    (s) => s.type === newFilament.type,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{agent.displayName}</h3>
            <p className="text-xs text-gray-500">{agent.nodeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filaments.length > 0 && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {filaments.length} filament{filaments.length > 1 ? 's' : ''}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Printer Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Printer Specifications
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Bed Width (mm)
                </label>
                <input
                  type="number"
                  value={config.bedWidth}
                  onChange={(e) =>
                    setConfig({ ...config, bedWidth: parseInt(e.target.value) })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Bed Depth (mm)
                </label>
                <input
                  type="number"
                  value={config.bedDepth}
                  onChange={(e) =>
                    setConfig({ ...config, bedDepth: parseInt(e.target.value) })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Bed Height (mm)
                </label>
                <input
                  type="number"
                  value={config.bedHeight}
                  onChange={(e) =>
                    setConfig({ ...config, bedHeight: parseInt(e.target.value) })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Nozzle Diameter (mm)
                </label>
                <input
                  type="text"
                  value={config.nozzleDiameter}
                  onChange={(e) =>
                    setConfig({ ...config, nozzleDiameter: e.target.value })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Hourly Rate (TND)
                </label>
                <input
                  type="text"
                  value={config.hourlyRate}
                  onChange={(e) =>
                    setConfig({ ...config, hourlyRate: e.target.value })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Default Layer Height (mm)
                </label>
                <input
                  type="text"
                  value={config.defaultLayerHeight}
                  onChange={(e) =>
                    setConfig({ ...config, defaultLayerHeight: e.target.value })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Default Infill (%)
                </label>
                <input
                  type="number"
                  value={config.defaultInfillPercent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultInfillPercent: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Wall Count
                </label>
                <input
                  type="number"
                  value={config.defaultWallCount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultWallCount: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Max Nozzle Temp (°C)
                </label>
                <input
                  type="number"
                  value={config.maxNozzleTemp}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxNozzleTemp: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Max Bed Temp (°C)
                </label>
                <input
                  type="number"
                  value={config.maxBedTemp}
                  onChange={(e) =>
                    setConfig({ ...config, maxBedTemp: parseInt(e.target.value) })
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.hasHeatedBed}
                  onChange={(e) =>
                    setConfig({ ...config, hasHeatedBed: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Heated Bed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.supportsMultiMaterial}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      supportsMultiMaterial: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Multi-Material</span>
              </label>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {/* Filaments Section */}
          {initialConfig?.id && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Available Filaments
                </h4>
                <button
                  onClick={() => setShowAddFilament(!showAddFilament)}
                  className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Filament
                </button>
              </div>

              {/* Add Filament Form - Simplified */}
              {showAddFilament && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-4">
                  <h5 className="font-medium text-green-900">Add Filament</h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Filament Type */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Filament Type
                      </label>
                      <select
                        value={newFilament.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          setNewFilament({
                            ...newFilament,
                            type,
                          });
                        }}
                        className="w-full rounded border px-2 py-1 text-sm"
                        disabled={filamentStandards.length === 0}
                      >
                        {filamentStandards.length === 0 ? (
                          <option value="">Loading filament types...</option>
                        ) : (
                          filamentStandards.map((s) => (
                            <option key={s.type} value={s.type}>
                              {s.type} - {s.name}
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-green-700 mt-1">
                        {filamentStandards.length > 0
                          ? `Auto price: ${getAutoPrice(newFilament.type)} TND/g`
                          : 'No filament types loaded'}
                      </p>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Color Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Red"
                        value={newFilament.color}
                        onChange={(e) =>
                          setNewFilament({ ...newFilament, color: e.target.value })
                        }
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Stock (grams)
                      </label>
                      <input
                        type="number"
                        placeholder="Leave empty for unlimited"
                        value={newFilament.stockGrams}
                        onChange={(e) =>
                          setNewFilament({
                            ...newFilament,
                            stockGrams: e.target.value,
                          })
                        }
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>

                  {/* Color Hex Picker */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">
                      Select Color Swatch
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {FILAMENT_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() =>
                            setNewFilament({
                              ...newFilament,
                              colorHex: c.hex,
                              color: newFilament.color || c.name,
                            })
                          }
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            newFilament.colorHex === c.hex
                              ? 'border-blue-500 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="color"
                        value={newFilament.colorHex}
                        onChange={(e) =>
                          setNewFilament({
                            ...newFilament,
                            colorHex: e.target.value,
                          })
                        }
                        className="h-8 w-8 rounded border"
                      />
                      <span className="text-xs text-gray-500">
                        Selected: {newFilament.colorHex}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddFilament}
                      disabled={!newFilament.color}
                      className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Add to Inventory
                    </button>
                    <button
                      onClick={() => setShowAddFilament(false)}
                      className="rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Filaments List */}
              {filaments.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No filaments added yet. Add filaments to make them available for
                  customers.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filaments.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: f.colorHex || '#ccc' }}
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {f.type} - {f.color}
                          </p>
                          <p className="text-xs text-gray-500">
                            {f.brand && `${f.brand} • `}
                            {f.pricePerGram} TND/g
                            {f.stockGrams !== null && ` • ${f.stockGrams}g in stock`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFilament(f.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
