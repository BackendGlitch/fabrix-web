"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Upload,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Printer,
  Ruler,
  Package,
  ArrowLeft,
  FileUp,
  DollarSign,
  Clock,
  Layers,
  Wallet,
  Plus,
  Box,
} from "lucide-react";
import toast from "react-hot-toast";

import { STLFileUpload } from "./stl-file-upload";
import { STLViewer } from "./stl-viewer";
import { PrinterStatus } from "./printer-status";
import {
  uploadSTL,
  fetchAvailablePrinters,
  createJob,
  type PrinterOption,
} from "@/lib/api/customer-jobs";
import {
  getWallet,
  payForJob,
  checkBalance,
  type Wallet as WalletType,
} from "@/lib/api/wallet";
import {
  calculatePrice,
  getAvailableFilaments,
  type PricingBreakdown,
  type FilamentOption,
} from "@/lib/api/pricing";

type FlowStep = "upload" | "preview" | "confirm" | "processing" | "complete";

interface JobDetails {
  fileId?: string;
  fileName?: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  printer?: PrinterOption & { printerConfigId?: string };
  scale: number;
  filament?: FilamentOption;
}

interface PriceEstimate {
  breakdown: PricingBreakdown;
  loading: boolean;
  error?: string;
}

interface PrinterFilaments {
  printerId: string;
  filaments: FilamentOption[];
  loading: boolean;
}

export function CustomerFlow() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const [currentStep, setCurrentStep] = useState<FlowStep>("upload");
  const [jobDetails, setJobDetails] = useState<JobDetails>({ scale: 1 });
  const [availablePrinters, setAvailablePrinters] = useState<PrinterOption[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBlob, setFileBlob] = useState<File | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [printerFilaments, setPrinterFilaments] = useState<Record<string, PrinterFilaments>>({});

  const steps = [
    { id: "upload", label: "Upload STL", icon: Upload },
    { id: "preview", label: "Preview Model", icon: Eye },
    { id: "confirm", label: "Confirm Print", icon: CheckCircle2 },
  ];

  const handleFileSelect = async (file: File) => {
    try {
      if (!accessToken) {
        toast.error("Your session is not ready yet. Please try again.");
        return;
      }

      setLoading(true);
      setSelectedFile(file);

      // Store file for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          const blob = new Blob([arrayBuffer], {
            type: "application/octet-stream",
          });
          const previewFile = new File([blob], file.name, {
            type: "application/octet-stream",
          });
          setFileBlob(previewFile);
        }
      };
      reader.readAsArrayBuffer(file);

      // Upload file to backend
      console.log("[CustomerFlow] Uploading file:", file.name);
      const uploadResponse = await uploadSTL(file, accessToken);

      if (!uploadResponse.file || !uploadResponse.file.id) {
        throw new Error("Failed to upload file");
      }

      // Fetch available printers
      const printersData = await fetchAvailablePrinters(accessToken);
      let selectedPrinter: PrinterOption | null = null;

      if (printersData.printers && printersData.printers.length > 0) {
        selectedPrinter = printersData.printers[0];
        toast.success(`✅ Printer found: ${selectedPrinter.displayName}`);
      } else {
        toast.loading("No printers available - your job will be queued");
      }

      // Update job details
      setJobDetails((prev) => ({
        ...prev,
        fileId: uploadResponse.file.id,
        fileName: file.name,
        printer: selectedPrinter || undefined,
      }));

      setCurrentStep("preview");
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("[CustomerFlow] Error uploading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload file";
      toast.error(errorMessage);
      setSelectedFile(null);
      setFileBlob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionsUpdate = (dimensions: {
    width: number;
    height: number;
    depth: number;
  }) => {
    setJobDetails((prev) => ({ ...prev, dimensions }));
  };

  const handleScaleChange = (scale: number) => {
    setJobDetails((prev) => ({ ...prev, scale }));
  };

  const handleProceedToConfirm = async () => {
    setCurrentStep("confirm");

    // Load filaments for selected printer
    if (jobDetails.printer?.printerConfigId) {
      const printerId = jobDetails.printer.printerConfigId;
      if (!printerFilaments[printerId]) {
        setPrinterFilaments((prev) => ({
          ...prev,
          [printerId]: { printerId, filaments: [], loading: true },
        }));

        try {
          const filaments = await getAvailableFilaments(printerId);
          setPrinterFilaments((prev) => ({
            ...prev,
            [printerId]: { printerId, filaments, loading: false },
          }));

          // Auto-select first filament if available
          if (filaments.length > 0 && !jobDetails.filament) {
            setJobDetails((prev) => ({ ...prev, filament: filaments[0] }));
            // Recalculate price with selected filament
            calculatePriceWithFilament(filaments[0]);
          }
        } catch (error) {
          console.error("Failed to load filaments:", error);
          setPrinterFilaments((prev) => ({
            ...prev,
            [printerId]: { printerId, filaments: [], loading: false },
          }));
        }
      }
    }

    // Calculate initial price estimate
    if (jobDetails.fileId && accessToken) {
      calculatePriceWithFilament(jobDetails.filament);
    }
  };

  const calculatePriceWithFilament = async (filament?: FilamentOption) => {
    console.log('[PriceCalc] Starting calculation:', {
      fileId: jobDetails.fileId,
      printerConfigId: jobDetails.printer?.printerConfigId,
      filamentId: filament?.id,
      scale: jobDetails.scale,
    });

    if (!jobDetails.fileId) {
      console.error('[PriceCalc] No fileId!');
      return;
    }

    setPriceEstimate({ breakdown: {} as PricingBreakdown, loading: true });

    try {
      const requestData = {
        fileId: jobDetails.fileId,
        scale: jobDetails.scale,
        printerConfigId: jobDetails.printer?.printerConfigId,
        filamentId: filament?.id,
        printSettings: {
          infillPercent: 20,
          layerHeight: "0.2",
          wallCount: 3,
          supportEnabled: false,
        },
      };
      console.log('[PriceCalc] Request:', requestData);

      const breakdown = await calculatePrice(requestData);
      console.log('[PriceCalc] Success:', breakdown);

      setPriceEstimate({ breakdown, loading: false });
    } catch (error) {
      console.error('[PriceCalc] Error:', error);
      setPriceEstimate({
        breakdown: {} as PricingBreakdown,
        loading: false,
        error: error instanceof Error ? error.message : "Could not calculate price estimate",
      });
    }
  };

  const handleFilamentSelect = (filament: FilamentOption) => {
    setJobDetails((prev) => ({ ...prev, filament }));
    calculatePriceWithFilament(filament);
  };

  const handleBack = () => {
    if (currentStep === "preview") {
      setCurrentStep("upload");
    } else if (currentStep === "confirm") {
      setCurrentStep("preview");
    }
  };

  const handleConfirmPrint = async () => {
    if (!jobDetails.fileId || !jobDetails.fileName) {
      toast.error("Missing file information");
      return;
    }

    // Check if price is calculated
    const totalPrice = priceEstimate?.breakdown?.totalPrice;
    if (!totalPrice) {
      toast.error("Please wait for price calculation");
      return;
    }

    try {
      setLoading(true);

      if (!jobDetails.fileId || !accessToken) {
        throw new Error("Missing file or authentication");
      }

      // 1. Check wallet balance
      const balanceCheck = await checkBalance(Math.ceil(totalPrice));
      
      if (!balanceCheck.hasEnough) {
        toast.error(
          `Insufficient credits. Required: ${Math.ceil(totalPrice)} TND, Available: ${balanceCheck.availableBalance} TND. Please top up your wallet.`
        );
        // Redirect to wallet page
        router.push("/dashboard/wallet");
        setLoading(false);
        return;
      }

      // 2. Create the job first
      const job = await createJob(
        {
          fileId: jobDetails.fileId,
          name: jobDetails.fileName?.replace(".stl", "") || "Untitled",
          description: `3D print job - ${new Date().toLocaleString()}`,
          metadata: {
            dimensions: jobDetails.dimensions,
            scale: jobDetails.scale,
            filamentId: jobDetails.filament?.id,
            filamentType: jobDetails.filament?.type,
            filamentColor: jobDetails.filament?.color,
            priceEstimate: totalPrice,
          },
        },
        accessToken,
      );

      // 3. Pay for the job using credits
      const paymentResult = await payForJob(job.id, Math.ceil(totalPrice));
      toast.success(`Payment successful! ${Math.ceil(totalPrice)} TND deducted from your wallet.`);

      setCurrentStep("processing");

      // Simulate processing time, then redirect to tracking
      setTimeout(() => {
        setCurrentStep("complete");
        setTimeout(() => {
          router.push(`/dashboard/customer/jobs/${job.id}`);
        }, 1500);
      }, 2000);
    } catch (error) {
      console.error("[CustomerFlow] Error creating job:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create print job";
      toast.error(errorMessage);
      setCurrentStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Upload Your 3D Model
              </h2>
              <p className="text-muted-foreground">
                Upload your STL file to start the printing process
              </p>
            </div>

            <div className="bg-surface rounded-lg shadow p-8">
              <STLFileUpload
                onFileSelect={handleFileSelect}
                isLoading={loading}
              />

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Printer Network Status
                  </h4>
                  <PrinterStatus
                    autoRefresh={true}
                    refreshInterval={5000}
                    showDetails={false}
                    className="bg-surface/70 rounded p-3"
                  />

                </div>

               
            </div>
          </div>
        );

      case "preview":
        return (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Preview Section - 2/3 width */}
              <div className="lg:col-span-2">
                <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-base font-semibold text-foreground">
                      3D Model Preview
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Drag to rotate • Scroll to zoom
                    </p>
                  </div>
                  <div
                    className="flex-1 relative bg-gradient-to-br from-gray-50 to-white"
                    style={{ minHeight: "500px" }}
                  >
                    {fileBlob && (
                      <STLViewer
                        file={fileBlob}
                        className="w-full h-full"
                        scale={jobDetails.scale}
                        onDimensions={handleDimensionsUpdate}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar - 1/3 width */}
              <div className="space-y-6">
                {/* File Info */}
                <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    File Details
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-sm font-bold text-foreground truncate mt-1">
                        {jobDetails.fileName}
                      </p>
                    </div>
                    {jobDetails.fileId && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          File ID
                        </p>
                        <p className="text-xs font-mono text-gray-700 truncate mt-1">
                          {jobDetails.fileId.substring(0, 16)}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Printer Status */}
                <PrinterStatus
                  autoRefresh={true}
                  refreshInterval={3000}
                  showDetails={true}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                />

                {/* Dimensions */}
                {jobDetails.dimensions && (
                  <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" />
                      Model Dimensions
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-secondary rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground">Width (X)</p>
                          <p className="text-sm font-bold text-foreground">
                            {jobDetails.dimensions.width.toFixed(2)} mm
                          </p>
                        </div>
                        <div className="bg-secondary rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground">Height (Y)</p>
                          <p className="text-sm font-bold text-foreground">
                            {jobDetails.dimensions.height.toFixed(2)} mm
                          </p>
                        </div>
                        <div className="bg-secondary rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground">Depth (Z)</p>
                          <p className="text-sm font-bold text-foreground">
                            {jobDetails.dimensions.depth.toFixed(2)} mm
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-900 font-semibold">
                          Volume
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {(
                            jobDetails.dimensions.width *
                            jobDetails.dimensions.height *
                            jobDetails.dimensions.depth
                          ).toFixed(2)}{" "}
                          mm³
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scale Controls */}
                <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    Scale Control
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Scale: {jobDetails.scale.toFixed(2)}x
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={jobDetails.scale}
                        onChange={(e) =>
                          handleScaleChange(parseFloat(e.target.value))
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => handleScaleChange(1)}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors text-sm"
                    >
                      Reset to 1:1 Scale
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 border border-gray-300 text-foreground font-medium rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleProceedToConfirm}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Continue to Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-lime/10 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Confirm Your Print Job
              </h2>
              <p className="text-muted-foreground">
                Review all details before starting the print
              </p>
            </div>

            <div className="bg-surface rounded-lg shadow border border-border p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Job Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Print Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-secondary rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">File Name</p>
                        <p className="font-medium text-foreground">
                          {jobDetails.fileName}
                        </p>
                      </div>

                      {jobDetails.dimensions && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-blue-900 font-semibold mb-2">
                            Dimensions
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-blue-800">Width</p>
                              <p className="text-sm font-bold text-blue-900">
                                {jobDetails.dimensions.width.toFixed(2)} mm
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-blue-800">Height</p>
                              <p className="text-sm font-bold text-blue-900">
                                {jobDetails.dimensions.height.toFixed(2)} mm
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-blue-800">Depth</p>
                              <p className="text-sm font-bold text-blue-900">
                                {jobDetails.dimensions.depth.toFixed(2)} mm
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-blue-800">Scale</p>
                            <p className="text-sm font-bold text-blue-900">
                              {jobDetails.scale.toFixed(2)}x
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filament Selection */}
                  {jobDetails.printer?.printerConfigId && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Select Filament
                      </h3>
                      {(() => {
                        const pf = printerFilaments[jobDetails.printer.printerConfigId];
                        if (!pf || pf.loading) {
                          return (
                            <div className="bg-secondary rounded-lg p-4 text-sm text-muted-foreground">
                              Loading available filaments...
                            </div>
                          );
                        }
                        if (pf.filaments.length === 0) {
                          return (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                              No filaments configured for this printer.
                              The owner needs to add filaments first.
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {pf.filaments.map((filament) => (
                              <label
                                key={filament.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  jobDetails.filament?.id === filament.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-border hover:bg-secondary'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="filament"
                                  checked={jobDetails.filament?.id === filament.id}
                                  onChange={() => handleFilamentSelect(filament)}
                                  className="sr-only"
                                />
                                <div
                                  className="w-6 h-6 rounded-full border"
                                  style={{ backgroundColor: filament.colorHex || '#ccc' }}
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-foreground">
                                    {filament.type} - {filament.color}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {filament.brand && `${filament.brand} • `}
                                    {filament.pricePerGram} TND/g
                                    {filament.stockGrams !== null && ` • ${filament.stockGrams}g available`}
                                  </p>
                                </div>
                                {jobDetails.filament?.id === filament.id && (
                                  <CheckCircle2 className="w-5 h-5 text-primary" />
                                )}
                              </label>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Printer Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Printer className="w-5 h-5 text-primary" />
                      Printer Status
                    </h3>
                    {jobDetails.printer ? (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900">
                              {jobDetails.printer.displayName}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Status:{" "}
                              <span className="font-semibold">
                                Online & Ready
                              </span>
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Estimated start:{" "}
                              <span className="font-semibold">Immediately</span>
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                              No Printers Available
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Your job will be queued and printed when a printer
                              becomes available
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Estimated wait:{" "}
                              <span className="font-semibold">Varies</span>
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 animate-pulse"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Summary & Actions */}
                <div className="space-y-6">
                  {/* Price Estimate */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Price Estimate
                    </h3>

                    {priceEstimate?.loading ? (
                      <div className="flex items-center gap-3 text-green-700">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Calculating price...</span>
                      </div>
                    ) : priceEstimate?.error ? (
                      <div className="text-amber-700 text-sm">
                        {priceEstimate.error}
                      </div>
                    ) : priceEstimate?.breakdown?.totalPrice ? (
                      <div className="space-y-4">
                        {/* Price Breakdown */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-green-800">
                            <span className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />
                              Filament ({priceEstimate.breakdown.filamentWeightGrams.toFixed(1)}g)
                            </span>
                            <span>{priceEstimate.breakdown.filamentCost.toFixed(2)} DT</span>
                          </div>
                          <div className="flex justify-between text-green-800">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Machine Time ({Math.ceil(priceEstimate.breakdown.estimatedPrintTimeMinutes / 60)}h)
                            </span>
                            <span>{priceEstimate.breakdown.machineTimeCost.toFixed(2)} DT</span>
                          </div>
                          {priceEstimate.breakdown.supportMaterialCost > 0 && (
                            <div className="flex justify-between text-green-800">
                              <span>Support Material</span>
                              <span>{priceEstimate.breakdown.supportMaterialCost.toFixed(2)} DT</span>
                            </div>
                          )}
                          <div className="flex justify-between text-green-800">
                            <span>Platform Fee</span>
                            <span>{priceEstimate.breakdown.platformFee.toFixed(2)} DT</span>
                          </div>
                        </div>

                        {/* Total - Credits Required */}
                        <div className="pt-3 border-t border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-900 text-lg">
                              Credits Required
                            </span>
                            <span className="font-bold text-green-900 text-2xl">
                              {Math.ceil(priceEstimate.breakdown.totalPrice)} Credits
                            </span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Equivalent to {Math.ceil(priceEstimate.breakdown.totalPrice)} TND (1 Credit = 1 TND)
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Estimated {priceEstimate.breakdown.estimatedPrintTimeMinutes} min print time
                          </p>
                        </div>

                        {/* Filament Info */}
                        <div className="text-xs text-green-700 bg-lime/5 rounded p-2">
                          Filament: {priceEstimate.breakdown.filamentType} • {priceEstimate.breakdown.filamentColor}
                        </div>

                        {/* Wallet Note */}
                        <div className="text-xs text-blue-700 bg-blue-50 rounded p-2 flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span>
                            You need {Math.ceil(priceEstimate.breakdown.totalPrice)} credits in your wallet. 
                            <a href="/dashboard/wallet" className="underline font-medium">Top up now</a>
                          </span>
                        </div>

                        {!priceEstimate.breakdown.fitsOnBed && (
                          <div className="text-xs text-amber-700 bg-amber-100 rounded p-2">
                            ⚠️ Model may not fit. Suggested scale: {priceEstimate.breakdown.scaleToFit?.toFixed(2)}x
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-green-700 text-sm">
                        Price will be calculated after you proceed
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">
                      Print Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-800">Job Type</span>
                        <span className="text-sm font-semibold text-blue-900">
                          3D Print
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-800">
                          Processing
                        </span>
                        <span className="text-sm font-semibold text-blue-900">
                          {jobDetails.printer ? "Direct Print" : "Queued"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-800">Status</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-blue-800">
                          Ready to Start
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleConfirmPrint}
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Start Printing Now
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBack}
                      className="w-full py-2.5 border border-gray-300 text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
                    >
                      Back to Preview
                    </button>

                    <div className="text-xs text-gray-500 text-center pt-4">
                      <p>
                        By clicking "Start Printing Now", you confirm that your
                        model is ready for printing.
                      </p>
                      <p className="mt-1">
                        You'll be redirected to track your print job in
                        real-time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Starting Your Print Job
            </h2>
            <p className="text-muted-foreground mb-8">
              We're setting up everything for your 3D print. This may take a
              moment...
            </p>

            <div className="bg-surface rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Uploading model data
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Preparing printer
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Initializing job
                  </span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Starting print</span>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-lime/10 rounded-full mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Print Job Started!
            </h2>
            <p className="text-muted-foreground mb-8">
              Your 3D print job has been successfully started. You can track its
              progress in real-time.
            </p>

            <div className="bg-surface rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Job ID</p>
                  <p className="font-mono text-sm text-foreground bg-gray-100 p-2 rounded">
                    {jobDetails.fileId?.substring(0, 12)}...
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="font-semibold text-green-600">
                    Printing in Progress
                  </p>
                </div>
                <button
                  onClick={() => router.push("/dashboard/customer" as any)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary py-8">
      {/* Progress Steps */}
      {currentStep !== "processing" && currentStep !== "complete" && (
        <div className="max-w-5xl mx-auto mb-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted =
                steps.findIndex((s) => s.id === currentStep) > index;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive || isCompleted
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-surface border-gray-300 text-gray-400"
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive || isCompleted
                          ? "text-primary"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-24 h-0.5 mx-2 ${
                        isCompleted ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">{renderStepContent()}</div>
    </div>
  );
}
