import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Star, ArrowRight } from 'lucide-react';
import { Book } from '../types.ts';
import { api } from '../services/api.ts';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  onViewAllResults: (query: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectBook,
  onViewAllResults,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.getBooks({ search: query.trim(), limit: 6 });
        setResults(data.books || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-5 text-stone-900 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                onViewAllResults(query.trim());
                onClose();
              }
            }}
            placeholder="Type book title, author, ISBN, or topic..."
            className="flex-1 text-sm sm:text-base bg-transparent border-none text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="mt-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-stone-400 italic">
              Searching database catalog...
            </div>
          ) : query && results.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500">
              No matching books found for "{query}".
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {results.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBook(b);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="font-serif font-semibold text-stone-900 text-sm hover:text-[#8B3A2B]">
                      {b.title}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {b.authors && b.authors[0] ? b.authors[0].name : 'Unknown Author'} ·{' '}
                      {b.category_name} · {b.publication_year}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="text-emerald-700 font-medium block">
                      {b.available_copies} available
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Shelf {b.shelf_number || 'A-12'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-3 mt-2 text-center">
                <button
                  onClick={() => {
                    onViewAllResults(query.trim());
                    onClose();
                  }}
                  className="text-xs font-semibold text-[#8B3A2B] hover:underline inline-flex items-center gap-1"
                >
                  <span>See all matching results in catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-stone-400">
              Quick access: search by book title, author, or ISBN barcode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
