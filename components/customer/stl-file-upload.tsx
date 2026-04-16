'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFileSelect: (file: File, fileId?: string) => void;
  isLoading?: boolean;
}

export function STLFileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validExtensions = ['.stl'];
    const validMimes = ['application/sla', 'model/stl', 'application/x-stl'];

    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    const hasValidMime = validMimes.includes(file.type);

    if (!hasValidExtension && !hasValidMime) {
      toast.error('Only STL files are allowed');
      return;
    }

    // Validate file size (500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File size exceeds 500MB limit');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">3D Model File (STL)</label>
        <p className="text-xs text-gray-500">
          Upload your 3D model in STL format. Max size: 500MB
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={triggerFileInput}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,application/sla,model/stl,application/x-stl"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading || uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">
              {selectedFile ? selectedFile.name : 'Drag and drop your STL file here'}
            </p>
            {!selectedFile && (
              <p className="text-sm text-gray-500">or click to browse</p>
            )}
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
            <p className="text-xs text-green-700">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
