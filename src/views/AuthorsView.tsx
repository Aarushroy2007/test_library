import React, { useState, useEffect } from 'react';
import { Search, User, BookOpen, ArrowRight, X } from 'lucide-react';
import { Author } from '../types.ts';
import { api } from '../services/api.ts';

interface AuthorsViewProps {
  onSelectAuthor: (authorId: string) => void;
}

export const AuthorsView: React.FC<AuthorsViewProps> = ({ onSelectAuthor }) => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAuthors();
  }, [search]);

  const loadAuthors = async () => {
    setLoading(true);
    try {
      const data = await api.getAuthors(search);
      setAuthors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Author Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#8B3A2B] block mb-1">
            Scholarly Directory
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Authors & Philosophers
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Meet the researchers, theoreticians, and chroniclers preserved in the Athenaeum library.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search author name or bio..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-900/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : authors.length === 0 ? (
        <div className="py-16 text-center text-stone-500">
          No authors matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {authors.map((auth) => (
            <div
              key={auth.id}
              onClick={() => onSelectAuthor(auth.id)}
              className="group bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between hover:border-amber-900/40"
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-13 h-13 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 font-serif font-bold text-lg shrink-0 group-hover:bg-amber-50 group-hover:text-[#8B3A2B] transition-colors">
                    {auth.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>

                  <div>
                    <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#8B3A2B] transition-colors">
                      {auth.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      {auth.birth_year && <span>b. {auth.birth_year}</span>}
                      {auth.birth_year && auth.nationality && <span aria-hidden="true">·</span>}
                      {auth.nationality && <span>{auth.nationality}</span>}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {auth.biography || 'Scholar whose foundational publications reside in the library.'}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-500">
                <span className="font-mono text-stone-600 font-semibold">
                  {auth.book_count ?? 0} {auth.book_count === 1 ? 'book' : 'books'} cataloged
                </span>
                <span className="text-[#8B3A2B] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                  View works <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
