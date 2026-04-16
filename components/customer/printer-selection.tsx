'use client';

import { useMemo } from 'react';
import { Cpu, AlertCircle } from 'lucide-react';
import type { PrinterOption } from '@/lib/api/customer-jobs';

interface PrinterSelectionProps {
  printers: PrinterOption[];
  selectedPrinterId?: string;
  onPrinterSelect: (printerId: string) => void;
  isLoading?: boolean;
}

export function PrinterSelection({
  printers,
  selectedPrinterId,
  onPrinterSelect,
  isLoading,
}: PrinterSelectionProps) {
  const onlinePrinters = useMemo(
    () => printers.filter((p) => p.status === 'online'),
    [printers],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Select Printer (Optional)</label>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading printers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Select Printer (Optional)</label>
        <p className="text-xs text-gray-500">
          Choose a printer now or assign one later. Only online printers are available.
        </p>
      </div>

      {onlinePrinters.length === 0 ? (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">No Printers Available</p>
            <p className="text-sm text-yellow-800">
              All printers are currently offline. You can assign one later.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {onlinePrinters.map((printer) => (
            <label
              key={printer.id}
              className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <input
                type="radio"
                name="printer"
                value={printer.id}
                checked={selectedPrinterId === printer.id}
                onChange={() => onPrinterSelect(printer.id)}
                disabled={isLoading}
                className="w-4 h-4 mt-1 text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{printer.displayName}</p>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                    {printer.activityState}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{printer.nodeId}</p>
                {printer.options && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    {Object.entries(printer.options).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-semibold capitalize">{key}:</span>{' '}
                        {typeof value === 'string' || typeof value === 'number'
                          ? value
                          : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
