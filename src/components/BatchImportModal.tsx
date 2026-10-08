import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  Sparkles,
  RefreshCw,
  FolderOpen,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { cuRecords, detectBookCategory, cleanBookTitle } from '../data/bookRecords.ts';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAuth();
  const [mode, setMode] = useState<'json' | 'tsv'>('json');
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Load the institutional 518 book records file
  const handleLoadCUFile = () => {
    const formatted = cuRecords.map((r) => {
      const cat = detectBookCategory(r.title);
      return {
        title: cleanBookTitle(r.title),
        author: r.author?.trim() || 'Scholarly Faculty',
        publisher: r.publisher?.trim() || 'Academic Press',
        accNo: r.accNo.trim(),
        accDate: r.accDate,
        category: cat.id,
        year: 2025,
        copies: 1,
      };
    });

    setMode('json');
    setRawText(JSON.stringify(formatted, null, 2));
    setFileName('Institutional_CU_Accessions_Catalog (518 Books).json');
    setErrorMsg(null);
    showToast(`Loaded ${formatted.length} books from the institutional catalog file.`, 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json') || content.trim().startsWith('[')) {
        setMode('json');
      } else {
        setMode('tsv');
      }
      setRawText(content);
      setErrorMsg(null);
      showToast(`Loaded ${file.name} successfully.`, 'info');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const parseInput = (): any[] => {
    if (!rawText.trim()) throw new Error('Please enter or load book records to import.');

    if (mode === 'json') {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON input must be an array of book objects.');
      }
      return parsed;
    } else {
      // Parse TSV/CSV lines
      const lines = rawText.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('Please provide at least a header row and one record row.');
      }
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

      const records: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map((p) => p.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          if (parts[idx] !== undefined) {
            if (h.includes('title')) row.title = parts[idx];
            else if (h.includes('author')) row.author = parts[idx];
            else if (h.includes('publisher')) row.publisher = parts[idx];
            else if (h.includes('acc') || h.includes('barcode')) row.accNo = parts[idx];
            else if (h.includes('cat')) row.category = parts[idx];
            else if (h.includes('year')) row.year = parseInt(parts[idx], 10);
            else if (h.includes('isbn')) row.isbn = parts[idx];
            else row[h] = parts[idx];
          }
        });
        if (row.title) records.push(row);
      }
      if (records.length === 0) throw new Error('No valid book rows found in table data.');
      return records;
    }
  };

  const handleImport = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const items = parseInput();
      const res = await api.batchImportBooks(items);
      showToast(res.message || `Successfully ingested ${items.length} titles.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse and update database records.');
    } finally {
      setLoading(false);
    }
  };

  // Quick preview count
  let detectedCount = 0;
  try {
    if (rawText.trim()) {
      if (mode === 'json' && rawText.trim().startsWith('[')) {
        const arr = JSON.parse(rawText);
        if (Array.isArray(arr)) detectedCount = arr.length;
      } else {
        const lines = rawText.trim().split('\n');
        if (lines.length > 1) detectedCount = lines.length - 1;
      }
    }
  } catch {
    // typing in progress
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FBF9F5] border-b border-stone-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B3A2B] text-amber-100 flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Batch Ingest / Connect Book Catalog File
              </h2>
              <p className="text-xs text-stone-600">
                Upload or connect book accession records directly to the Athenaeum library database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Connect Presets Bar */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-[#8B3A2B] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Institutional Accession File Available
                </h4>
                <p className="text-[11px] text-amber-800/90">
                  518 university accession titles with physical barcodes, departments, and shelf coordinates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.csv,.tsv,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-stone-500" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={handleLoadCUFile}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Connect 518 Books File</span>
              </button>
            </div>
          </div>

          {/* Format Selection & Stats Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200/80">
              <button
                type="button"
                onClick={() => setMode('json')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'json' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                JSON Array
              </button>
              <button
                type="button"
                onClick={() => setMode('tsv')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'tsv' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tab / CSV Text
              </button>
            </div>

            {detectedCount > 0 && (
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{detectedCount} books ready to ingest</span>
              </span>
            )}
          </div>

          {fileName && (
            <div className="text-xs text-stone-600 flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
              <FileText className="w-3.5 h-3.5 text-[#8B3A2B]" />
              <span>Current file: <strong>{fileName}</strong></span>
            </div>
          )}

          {/* Text Area */}
          <div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              rows={11}
              placeholder={
                mode === 'json'
                  ? '[\n  {\n    "title": "Book Title",\n    "author": "Author Name",\n    "publisher": "Publisher",\n    "accNo": "T50999",\n    "category": "cat_compsci",\n    "copies": 2\n  }\n]'
                  : 'Title\tAuthor\tPublisher\tAccNo\tCategory\nQuantum Algorithms\tDalzell\tCambridge\tT50756\tcat_compsci'
              }
              className="w-full text-xs font-mono p-3.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8B3A2B]/20 focus:border-[#8B3A2B] text-stone-800 transition-all leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              Records will be synchronized with SQLite immediately. Physical accession copies, barcode identifiers,
              and categories will be linked to the live catalog and digital reading room.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FBF9F5] border-t border-stone-200/90 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-200/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !rawText.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting to Database...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Ingest {detectedCount > 0 ? `${detectedCount} Books` : 'to Database'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
