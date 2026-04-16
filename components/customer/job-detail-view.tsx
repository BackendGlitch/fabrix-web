'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getJobDetail, type JobDetail } from '@/lib/api/customer-jobs';
import { AlertCircle, Loader, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROUTES } from '@/lib/routes';

interface JobDetailViewProps {
  jobId: string;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    icon: <Clock className="w-5 h-5" />,
  },
  queued: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    icon: <Clock className="w-5 h-5" />,
  },
  printing: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    icon: <Loader className="w-5 h-5 animate-spin" />,
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  cancelled: {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    icon: <AlertCircle className="w-5 h-5" />,
  },
};

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const data = await getJobDetail(jobId);
        setJob(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load job';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-800 mt-1">{error || 'Job not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = statusColors[job.status] || statusColors.pending;
  const createdDate = new Date(job.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Job Created Successfully!</p>
            <p className="text-sm text-green-800 mt-1">
              Your print job has been created and is ready for processing.
            </p>
          </div>
        </div>
      </div>

      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
            {job.description && (
              <p className="text-gray-600 mt-2">{job.description}</p>
            )}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusStyle.bg}`}>
            {statusStyle.icon}
            <span className={`font-semibold capitalize ${statusStyle.text}`}>
              {job.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Job ID</p>
            <p className="font-mono text-gray-900 break-all">{job.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-gray-900">{createdDate}</p>
          </div>
        </div>
      </div>

      {/* File Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">File Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">File Name</p>
            <p className="font-medium text-gray-900">{job.file.originalName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">File Size</p>
              <p className="font-medium text-gray-900">
                {(parseInt(job.file.size, 10) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MIME Type</p>
              <p className="font-medium text-gray-900">{job.file.mimeType}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Uploaded</p>
            <p className="font-medium text-gray-900">
              {new Date(job.file.uploadedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Printer Assignment */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Printer Assignment</h2>
        {job.printerId ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Assigned Printer</p>
            <p className="font-medium text-gray-900">Printer ID: {job.printerId}</p>
            <p className="text-xs text-gray-600 mt-3">
              Your job has been assigned to a printer and will begin printing soon.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              No printer has been assigned yet. Your job will be assigned when a suitable printer becomes available.
            </p>
          </div>
        )}
      </div>

      {/* Print Settings */}
      {job.metadata && Object.keys(job.metadata).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Print Settings</h2>
          <div className="space-y-3">
            {Object.entries(job.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 capitalize">{key}:</span>
                <span className="font-medium text-gray-900">
                  {typeof value === 'string' || typeof value === 'number'
                    ? value
                    : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push(ROUTES.dashboardAreas.customer)}
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => router.push(ROUTES.dashboardAreas.customer)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          View All Jobs
        </button>
      </div>
    </div>
  );
}
