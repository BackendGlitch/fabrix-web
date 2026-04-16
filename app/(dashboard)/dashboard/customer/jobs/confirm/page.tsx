'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { createJob, fetchAvailablePrinters, type PrinterOption } from '@/lib/api/customer-jobs';
import { ROUTES } from '@/lib/routes';
import Link from 'next/link';
import { ArrowLeft, Home, Package, LogOut, AlertCircle, CheckCircle2, Clock, Printer, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { STLViewer } from '@/components/customer/stl-viewer';

const roleLabels: Record<string, string> = {
  OWNER: 'Property Owner',
  CUSTOMER: 'Customer',
  ADMIN: 'Administrator',
};

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navLinks: NavLink[] = [
  {
    label: 'Dashboard',
    href: ROUTES.dashboard,
    icon: <Home className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
  {
    label: 'My Jobs',
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Package className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
];

export default function ConfirmPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');
  const printerId = searchParams.get('printerId');

  const [printer, setPrinter] = useState<PrinterOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<File | null>(null);

  const roleLabel = session ? roleLabels[session.user.role] ?? session.user.role : '';

  useEffect(() => {
    // Validate params
    if (!fileId || !fileName) {
      setError('Invalid confirmation details. Please upload the file again.');
      setLoading(false);
      return;
    }

    // Retrieve file from sessionStorage (stored as base64)
    const stlFileData = sessionStorage.getItem('stlFileData');
    const stlFileName = sessionStorage.getItem('stlFileName');
    if (stlFileData && stlFileName) {
      try {
        // Decode base64 to ArrayBuffer
        const binary = atob(stlFileData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const file = new File([blob], stlFileName, { type: 'application/octet-stream' });
        setFileBlob(file);
        console.log('[ConfirmPrintPage] File retrieved from sessionStorage');
      } catch (err) {
        console.error('[ConfirmPrintPage] Error retrieving file:', err);
      }
    }

    // Load printer details if available
    const loadPrinterDetails = async () => {
      try {
        if (printerId) {
          const data = await fetchAvailablePrinters();
          const found = data.printers.find((p) => p.id === printerId);
          if (found) {
            setPrinter(found);
          }
        }
      } catch (err) {
        console.error('[ConfirmPrintPage] Error loading printer:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPrinterDetails();
  }, [fileId, fileName, printerId]);

  const handleConfirmPrint = async () => {
    if (!fileId) {
      toast.error('File information missing');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      console.log('[ConfirmPrintPage] Creating job with:', {
        fileId,
        fileName,
        printerId,
      });

      const job = await createJob({
        fileId,
        name: fileName?.replace('.stl', '') || 'Untitled',
        description: `Automatic print job - ${new Date().toLocaleString()}`,
        metadata: printerId ? { assignedPrinterId: printerId } : undefined,
      });

      console.log('[ConfirmPrintPage] Job created successfully:', job);
      toast.success(
        printer
          ? `✅ Print started on ${printer.displayName}!`
          : '✅ Job queued successfully - will print when printer available'
      );

      // Redirect to job detail
      router.push(`/dashboard/customer/jobs/${job.id}`);
    } catch (err) {
      console.error('[ConfirmPrintPage] Job creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Same as Main Dashboard */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Fabrix</h1>
              <nav className="hidden md:flex gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      link.href === ROUTES.dashboardAreas.customerJobs
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session?.user.name}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: ROUTES.auth.login })}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 py-2 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as any}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 whitespace-nowrap text-sm"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Confirm Print Job</h1>
            <p className="text-gray-600 mt-1">Review your model and printer details before confirming</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">Loading confirmation details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 3D Preview - Left */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-base font-semibold text-gray-900">3D Model Preview</h3>
                    <p className="text-xs text-gray-500 mt-1">Drag to rotate • Scroll to zoom</p>
                  </div>
                  <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-white" style={{ minHeight: '500px' }}>
                    {fileBlob ? (
                      <STLViewer file={fileBlob} className="w-full h-full" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-3">
                          <Loader className="w-6 h-6 text-blue-600 mx-auto animate-spin" />
                          <p className="text-sm text-gray-600 font-medium">Loading 3D preview...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* File Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    File Details
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Name</p>
                      <p className="text-sm font-bold text-gray-900 truncate mt-1">{fileName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ID</p>
                      <p className="text-xs font-mono text-gray-700 truncate mt-1">{fileId.substring(0, 16)}...</p>
                    </div>
                  </div>
                </div>

                {/* Printer Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-blue-600" />
                    Printer
                  </h3>
                  {printer ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{printer.displayName}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200 flex gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-green-900">Ready to Print</p>
                          <p className="text-xs text-green-700 mt-0.5">Starts immediately</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 flex gap-3">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-900">Queued</p>
                        <p className="text-xs text-amber-700 mt-0.5">Will print when available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-3">Status</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className="font-semibold text-gray-900">3D Print</span>
                    </div>
                    <div className="border-t border-blue-200" />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-8 border-t border-gray-100">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="px-6 py-2.5 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrint}
                disabled={submitting || !fileBlob}
                className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Print
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
