'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { testsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Log API URL on mount
    console.log('📡 Frontend API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      setError('');
      setUploadResult(null);
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      // Test info will be extracted from Excel cells I1-I6
      const response = await testsApi.uploadExcel(file);
      setUploadResult(response.data);
      setFile(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMsg);
      console.error('Upload error details:', err.response?.data || err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-foreground mb-2">Upload Test Results</h1>
            <p className="text-muted-foreground">Upload Excel file with student test data</p>
          </div>
          
          {/* Steps Indicator */}
          <div className="mt-6 flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 ${file ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                file ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {file ? '✓' : '1'}
              </div>
              <span>Select Excel File</span>
            </div>
            <div className="h-0.5 w-8 bg-muted"></div>
            <div className={`flex items-center gap-2 ${file ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                file ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span>Process Data</span>
            </div>
          </div>
        </motion.div>

        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-2 border-dashed">
            <CardContent className="p-8">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200
                  ${isDragActive 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />
                <motion.div
                  animate={{ scale: isDragActive ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                </motion.div>
                {file ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="mx-auto h-8 w-8 text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop Excel file'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (supports .xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* File Details & Upload Button */}
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>File Selected</CardTitle>
                <CardDescription>
                  Ready to upload and process. Test info will be extracted from Excel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">File Name</p>
                    <p className="font-medium">{file.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">File Size</p>
                    <p className="font-medium">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">Excel Spreadsheet</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Info</p>
                    <p className="font-medium">Will be extracted from Excel</p>
                  </div>
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="w-full text-lg py-6"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Excel File...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Upload & Process Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
          >
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </motion.div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">File uploaded successfully!</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Upload Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Test Info */}
                {(uploadResult.test || uploadResult.results?.test) && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm font-medium mb-2 text-indigo-900">Test Information (from Excel):</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Test Name:</span>
                        <span className="font-medium text-slate-900">
                          {(uploadResult.test || uploadResult.results?.test)?.testName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Test Date:</span>
                        <span className="font-medium text-slate-900">
                          {formatDate((uploadResult.test || uploadResult.results?.test)?.testDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Max Marks:</span>
                        <span className="font-medium text-slate-900">
                          {(uploadResult.test || uploadResult.results?.test)?.maxMarks || 300}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Processing Results */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm font-semibold mb-3 text-slate-900">Processing Summary:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Processed:</span>
                        <span className="font-semibold text-green-700">
                          {uploadResult.results?.processed || 0} students
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Skipped:</span>
                        <span className="font-semibold text-yellow-700">
                          {uploadResult.results?.skipped || 0} students
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold mb-3 text-blue-900">Student Records:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">New Students Added:</span>
                        <span className="font-semibold text-blue-700">
                          {uploadResult.results?.studentsCreated || 0} students
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Existing Students Updated:</span>
                        <span className="font-semibold text-indigo-700">
                          {uploadResult.results?.studentsUpdated || 0} students
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test Results Details */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold mb-3 text-purple-900">Test Results:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">New Test Results Created:</span>
                        <span className="font-semibold text-purple-700">
                          {uploadResult.results?.testResultsCreated || 0} results
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Existing Test Results Updated:</span>
                        <span className="font-semibold text-violet-700">
                          {uploadResult.results?.testResultsUpdated || 0} results
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {uploadResult.results?.errors?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Errors ({uploadResult.results.errors.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.results.errors.slice(0, 10).map((err: string, idx: number) => (
                        <p key={idx} className="text-xs text-slate-600">{err}</p>
                      ))}
                      {uploadResult.results.errors.length > 10 && (
                        <p className="text-xs text-slate-600">
                          ... and {uploadResult.results.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

