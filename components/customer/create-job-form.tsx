'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

import { STLFileUpload } from './stl-file-upload';
import {
  fetchAvailablePrinters,
  uploadSTL,
  type PrinterOption,
} from '@/lib/api/customer-jobs';

export function CreateJobForm() {
  const router = useRouter();

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      setSelectedFile(file);
      setUploading(true);

      console.log('[CreateJobForm] Uploading file:', file.name);
      const response = await uploadSTL(file);
      console.log('[CreateJobForm] Upload response:', response);

      if (!response.file || !response.file.id) {
        throw new Error('No file ID returned from upload');
      }

      const uploadedFileId = response.file.id;
      toast.success('File uploaded successfully');

      // Auto-fetch available printers
      console.log('[CreateJobForm] Fetching available printers...');
      setLoadingPrinters(true);
      const printersData = await fetchAvailablePrinters();
      console.log('[CreateJobForm] Available printers:', printersData.printers);

      let selectedPrinter: PrinterOption | null = null;

      if (printersData.printers && printersData.printers.length > 0) {
        // Auto-select first printer
        selectedPrinter = printersData.printers[0];
        console.log('[CreateJobForm] Auto-selected printer:', selectedPrinter);
        toast.success(`✅ Printer found: ${selectedPrinter.displayName}`);
      } else {
        console.log('[CreateJobForm] No printers available, will queue job');
        toast.loading('No printers available - your job will be queued');
      }

      // Redirect to confirmation page
      const confirmUrl = new URL('/dashboard/customer/jobs/confirm', window.location.origin);
      confirmUrl.searchParams.set('fileId', uploadedFileId);
      confirmUrl.searchParams.set('fileName', file.name);
      if (selectedPrinter) {
        confirmUrl.searchParams.set('printerId', selectedPrinter.id);
      }

      // Store file in sessionStorage as base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          // Convert to base64 string for persistent storage
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          sessionStorage.setItem('stlFileData', base64);
          sessionStorage.setItem('stlFileName', file.name);
          console.log('[CreateJobForm] File stored in sessionStorage as base64');
        }
        console.log('[CreateJobForm] Redirecting to confirmation page:', confirmUrl.toString());
        router.push((confirmUrl.pathname + confirmUrl.search) as any);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('[CreateJobForm] Error during file selection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      toast.error(errorMessage);
      setSelectedFile(null);
    } finally {
      setUploading(false);
      setLoadingPrinters(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload STL File to Print</h2>
          <p className="text-gray-600">Simply upload your model and we'll handle the rest automatically</p>
        </div>

        {uploading || loadingPrinters ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-600">
              {uploading ? 'Uploading file...' : 'Searching for available printers...'}
            </p>
          </div>
        ) : (
          <STLFileUpload onFileSelect={handleFileSelect} isLoading={false} />
        )}

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-1">✨ Automatic</p>
            <p className="text-sm text-blue-800">No manual configuration needed</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-900 mb-1">🔍 Smart Detection</p>
            <p className="text-sm text-green-800">Finds best available printer</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-orange-900 mb-1">⏱️ Queue Support</p>
            <p className="text-sm text-orange-800">Queued if no printers available</p>
          </div>
        </div>
      </div>
    </div>
  );
}

