'use client';

import { AlertCircle, CheckCircle2, Clock, User, Printer, Loader } from 'lucide-react';
import { PrinterOption } from '@/lib/api/customer-jobs';

interface PrintConfirmationModalProps {
  fileName: string;
  printer: PrinterOption | null;
  estimatedTime?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PrintConfirmationModal({
  fileName,
  printer,
  estimatedTime,
  onConfirm,
  onCancel,
  isLoading = false,
  error = null,
}: PrintConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Ready to Print?</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* File Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">File to Print</p>
                <p className="text-lg font-semibold text-gray-900 truncate">{fileName}</p>
              </div>

              {/* Printer Information */}
              {printer ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Printer className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Selected Printer</p>
                        <p className="text-lg font-semibold text-gray-900">{printer.displayName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Printer Owner */}
                  {/* Note: Owner info will be added once agent sends owner details */}

                  {/* Estimated Time */}
                  {estimatedTime && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Estimated Print Time</p>
                          <p className="text-lg font-semibold text-gray-900">{estimatedTime}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">Ready to Print</p>
                      <p className="text-sm text-green-700 mt-1">Your job will be sent to the printer automatically</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">No Printers Available</p>
                    <p className="text-sm text-yellow-700 mt-1">Your job will be queued and printed as soon as a printer becomes available</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || (error !== null)}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Printing...
              </>
            ) : (
              'Confirm & Print'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
