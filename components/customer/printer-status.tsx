"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  fetchAvailablePrinters,
  type AvailablePrinters,
} from "@/lib/api/customer-jobs";

interface PrinterStatusProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  className?: string;
}

export function PrinterStatus({
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  showDetails = false,
  className = "",
}: PrinterStatusProps) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const [printersData, setPrintersData] = useState<AvailablePrinters | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrinterStatus = async () => {
    if (!accessToken) {
      return;
    }

    try {
      setLoading(true);
      const data = await fetchAvailablePrinters(accessToken);
      setPrintersData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch printer status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch printer status",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    fetchPrinterStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchPrinterStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, accessToken]);

  const onlineCount = printersData?.printers.length || 0;
  const totalCount = printersData?.count || 0; // Note: this currently shows only online printers count

  const getStatusColor = () => {
    if (onlineCount === 0) return "text-red-600 bg-red-100";
    if (onlineCount < 3) return "text-amber-600 bg-amber-100";
    return "text-green-600 bg-green-100";
  };

  const getStatusText = () => {
    if (onlineCount === 0) return "No printers online";
    if (onlineCount === 1) return "1 printer online";
    return `${onlineCount} printers online`;
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Printers Status
          </h3>
          <p className="text-xs text-gray-500">Real-time network status</p>
        </div>
        {autoRefresh && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        )}
      </div>

      {loading && !printersData ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      ) : error ? (
        <div className="py-3 text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchPrinterStatus}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
                >
                  {getStatusText()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {onlineCount}
                </div>
                <div className="text-xs text-gray-500">connected</div>
              </div>
            </div>

            {/* Progress bar showing availability */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${onlineCount > 0 ? "100%" : "0%"}` }}
              ></div>
            </div>
          </div>

          {showDetails && printersData && printersData.printers.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Available Printers:
              </p>
              <div className="space-y-2">
                {printersData.printers.slice(0, 3).map((printer) => (
                  <div
                    key={printer.id}
                    className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900 truncate">
                        {printer.displayName}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {printer.activityState === "idle" ? "Ready" : "Working"}
                    </div>
                  </div>
                ))}
                {printersData.printers.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{printersData.printers.length - 3} more printers
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
            <button
              onClick={fetchPrinterStatus}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {loading ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            {lastUpdated && (
              <span title={lastUpdated.toLocaleString()}>
                Updated{" "}
                {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
