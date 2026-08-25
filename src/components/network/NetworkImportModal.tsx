'use client';

import React, { useState } from 'react';
import { NetworkContact, NetworkColumnMapping, ImportPreviewResult } from '@/types/network';
import {
  parseCSVData,
  parseExcelData,
  autoDetectColumnMapping,
  processRawNetworkRows,
} from '@/lib/networkParser';
import { IconUpload, IconFileText, IconCheckCircle, IconAlertTriangle } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (contacts: NetworkContact[]) => void;
}

export function NetworkImportModal({ isOpen, onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<NetworkColumnMapping>({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    company: '',
    position: '',
    linkedInUrl: '',
    connectedOn: '',
  });
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setIsProcessing(true);

      try {
        let headers: string[] = [];
        let rows: Record<string, string>[] = [];

        if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const excelData = parseExcelData(arrayBuffer);
          headers = excelData.headers;
          rows = excelData.rows;
        } else {
          const text = await selectedFile.text();
          const csvData = parseCSVData(text);
          headers = csvData.headers;
          rows = csvData.rows;
        }

        if (rows.length === 0) {
          throw new Error('No data rows found in uploaded file.');
        }

        const detected = autoDetectColumnMapping(headers);
        setParsedHeaders(headers);
        setRawRows(rows);
        setMapping(detected);

        const source = selectedFile.name.toLowerCase().includes('linkedin')
          ? 'linkedin_csv'
          : selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
          ? 'excel'
          : 'generic_csv';

        const preview = processRawNetworkRows(rows, detected, source);
        setPreviewResult(preview);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.');
        setPreviewResult(null);
        setParsedHeaders([]);
        setRawRows([]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleMappingChange = (field: keyof NetworkColumnMapping, value: string) => {
    const updatedMapping = { ...mapping, [field]: value };
    setMapping(updatedMapping);

    if (rawRows.length > 0) {
      const source = file?.name.toLowerCase().includes('linkedin')
        ? 'linkedin_csv'
        : file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls')
        ? 'excel'
        : 'generic_csv';
      const preview = processRawNetworkRows(rawRows, updatedMapping, source);
      setPreviewResult(preview);
    }
  };

  const handleCommit = () => {
    if (!previewResult || previewResult.mappedContacts.length === 0) return;
    onImportComplete(previewResult.mappedContacts);
    onClose();
  };

  const hasValidContacts = Boolean(previewResult && previewResult.mappedContacts.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <IconUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Import Professional Network Contacts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload your LinkedIn Connections CSV or Excel sheet for intelligent company matching.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {!previewResult ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
                <IconCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Client-Side Storage:</strong> Your contacts remain strictly inside your browser storage (`ccc_network_v1`). Contact data is never sent to external AI servers for matching.
                </span>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                  id="network-file-upload"
                />
                <label htmlFor="network-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <IconFileText className="w-10 h-10 text-slate-400" />
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {isProcessing ? 'Parsing Contacts File...' : file ? file.name : 'Select LinkedIn Connections CSV or Excel (.xlsx / .xls)'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isProcessing ? 'Reading headers and deduplicating rows...' : 'Auto-detects LinkedIn preamble, First Name, Last Name, Company, Position, and URLs'}
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{previewResult.totalRows}</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Valid Contacts</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{previewResult.mappedContacts.length}</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Companies</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{previewResult.detectedCompanies.length}</span>
                </div>
              </div>

              {/* Column Mapping Review */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Verify Detected Column Mappings
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewResult(null);
                      setFile(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Upload Different File
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">First Name Column</label>
                    <select
                      value={mapping.firstName}
                      onChange={(e) => handleMappingChange('firstName', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Last Name Column</label>
                    <select
                      value={mapping.lastName}
                      onChange={(e) => handleMappingChange('lastName', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Full Name Column (Single Column)</label>
                    <select
                      value={mapping.fullName}
                      onChange={(e) => handleMappingChange('fullName', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None / Use First+Last --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Company / Organization Column</label>
                    <select
                      value={mapping.company}
                      onChange={(e) => handleMappingChange('company', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Position / Job Title Column</label>
                    <select
                      value={mapping.position}
                      onChange={(e) => handleMappingChange('position', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">LinkedIn Profile URL Column</label>
                    <select
                      value={mapping.linkedInUrl}
                      onChange={(e) => handleMappingChange('linkedInUrl', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Email Address Column</label>
                    <select
                      value={mapping.email}
                      onChange={(e) => handleMappingChange('email', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Connection Date Column</label>
                    <select
                      value={mapping.connectedOn}
                      onChange={(e) => handleMappingChange('connectedOn', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium block">Sample Contact Preview (First 3):</span>
                {previewResult.mappedContacts.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                    No valid contacts found with current column mappings. Select appropriate name/email columns above.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    {previewResult.mappedContacts.slice(0, 3).map((c, i) => (
                      <div key={i} className="p-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{c.fullName}</span>
                          <span className="text-slate-500 ml-2">{c.position || 'Contact'}</span>
                        </div>
                        <span className="text-slate-400 font-medium">{c.company || 'No Company'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Cancel
          </button>
          {previewResult && (
            <button
              type="button"
              onClick={handleCommit}
              disabled={!hasValidContacts}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <IconCheckCircle className="w-4 h-4" />
              <span>Import {previewResult.mappedContacts.length} Contacts</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
