import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Database, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

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

  if (!isOpen) return null;

  const sampleJSON = JSON.stringify(
    [
      {
        title: 'Quantum Computing for Computer Scientists',
        author: 'Noson S. Yanofsky',
        publisher: 'Cambridge University Press',
        year: 2024,
        category: 'cat_compsci',
        copies: 2,
        accNo: 'QC-701',
        shelfNumber: 'CS-QC-01',
        section: 'Computing & AI Hall',
        floor: 2,
        isbn: '978-0521879965',
        description: 'Comprehensive introduction to quantum computing algorithms, circuits, and quantum complexity theory.',
      },
      {
        title: 'Biomechanical Foundations of Athletic Movement',
        author: 'Robert M. Malina',
        publisher: 'Human Kinetics',
        year: 2025,
        category: 'cat_sports',
        copies: 3,
        accNo: 'SP-902',
        shelfNumber: 'SP-KIN-03',
        section: 'Exercise & Kinesiology Wing',
        floor: 1,
        isbn: '978-1492598765',
        description: 'Foundations of kinematic analysis, force distribution, and physiological athletic adaptation.',
      },
      {
        title: 'Modern Semiconductor Device Physics',
        author: 'Simon M. Sze',
        publisher: 'Wiley-Interscience',
        year: 2025,
        category: 'cat_engineering',
        copies: 2,
        accNo: 'EE-410',
        shelfNumber: 'EN-PHY-04',
        section: 'Engineering & Technology Stacks',
        floor: 1,
        isbn: '978-0471152378',
        description: 'In-depth coverage of submicron devices, bandgap engineering, and heterostructure field effect transistors.',
      },
    ],
    null,
    2
  );

  const sampleTSV = `Title\tAuthor\tPublisher\tAccNo\tCategory
Deep Learning Architectures\tIan Goodfellow\tMIT Press\tDL-101\tcat_compsci
Fluid Mechanics & Heat Transfer\tFrank M. White\tMcGraw Hill\tFM-304\tcat_engineering
Neurobiology of Cognition\tEric R. Kandel\tOxford Press\tNB-508\tcat_biomedical`;

  const handleLoadSample = () => {
    if (mode === 'json') {
      setRawText(sampleJSON);
    } else {
      setRawText(sampleTSV);
    }
    setErrorMsg(null);
  };

  const parseInput = (): any[] => {
    if (!rawText.trim()) throw new Error('Please enter book records to import.');

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
      showToast(res.message, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse and update database records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FBF9F5] border-b border-stone-200/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B3A2B] text-amber-100 flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Batch Ingest / Update Database
              </h2>
              <p className="text-xs text-stone-600">
                Import or update catalog records, physical copies, and authors directly into SQLite
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
        <div className="p-6 space-y-4">
          {/* Format Selection Bar */}
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

            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-[#8B3A2B] hover:text-[#732F23] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Template</span>
            </button>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              rows={12}
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

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Records will be inserted or updated in SQLite immediately with foreign keys linked to authors,
              categories, and generated accession copies on the library physical shelves.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FBF9F5] border-t border-stone-200/90 flex items-center justify-end gap-2.5">
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
                <span>Updating Database...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Update Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
