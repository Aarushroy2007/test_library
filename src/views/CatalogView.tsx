import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  BookX,
  X,
  Check,
} from 'lucide-react';
import { Book, Category, Author, BookFilterParams } from '../types.ts';
import { BookCard } from '../components/BookCard.tsx';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CatalogViewProps {
  onSelectBook: (book: Book) => void;
  initialParams?: BookFilterParams;
  onOpenReader?: (bookId: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  onSelectBook,
  initialParams,
  onOpenReader,
}) => {
  const { currentUser } = useAuth();

  // Search input & debouncing
  const [searchInput, setSearchInput] = useState<string>(initialParams?.search || '');
  const [activeSearch, setActiveSearch] = useState<string>(initialParams?.search || '');

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>(initialParams?.category || 'all');
  const [selectedCollection, setSelectedCollection] = useState<string>(initialParams?.collection || 'all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>(initialParams?.author || 'all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>(
    initialParams?.availability || 'all'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialParams?.language || 'all');
  const [selectedFormat, setSelectedFormat] = useState<string>(initialParams?.format || 'all');
  const [selectedYearRange, setSelectedYearRange] = useState<string>(initialParams?.yearRange || 'all');
  const [selectedSort, setSelectedSort] = useState<string>(initialParams?.sort || 'relevance');

  // Pagination & Layout
  const [page, setPage] = useState<number>(1);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);

  // Data state
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Initial load of filter dictionaries
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, auths] = await Promise.all([api.getCategories(), api.getAuthors()]);
        setCategories(cats);
        setAuthors(auths);
      } catch (e) {
        console.error('Failed to load filter metadata', e);
      }
    }
    loadMetadata();
  }, []);

  // Fetch books whenever filters, search, sort, or page change
  useEffect(() => {
    fetchBooks();
  }, [
    activeSearch,
    selectedCategory,
    selectedCollection,
    selectedAuthor,
    selectedAvailability,
    selectedLanguage,
    selectedFormat,
    selectedYearRange,
    selectedSort,
    page,
    currentUser?.id,
  ]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await api.getBooks(
        {
          search: activeSearch,
          category: selectedCategory,
          collection: selectedCollection,
          author: selectedAuthor,
          availability: selectedAvailability,
          language: selectedLanguage,
          format: selectedFormat,
          yearRange: selectedYearRange,
          sort: selectedSort,
          page,
          limit: 12,
        },
        currentUser?.id
      );
      setBooks(data.books || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalBooks(data.pagination.total || 0);
    } catch (e) {
      console.error('Failed to fetch books', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setSelectedCategory('all');
    setSelectedCollection('all');
    setSelectedAuthor('all');
    setSelectedAvailability('all');
    setSelectedLanguage('all');
    setSelectedFormat('all');
    setSelectedYearRange('all');
    setSelectedSort('relevance');
    setPage(1);
  };

  const hasActiveFilters =
    activeSearch !== '' ||
    selectedCategory !== 'all' ||
    selectedCollection !== 'all' ||
    selectedAuthor !== 'all' ||
    selectedAvailability !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedFormat !== 'all' ||
    selectedYearRange !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#8B3A2B] block mb-1">
            General Catalog
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Library Catalog & Archives
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Search across titles, authors, ISBNs, disciplines, and physical shelves.
          </p>
        </div>

        {/* View toggles & filter drawer button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              hasActiveFilters || filterPanelOpen
                ? 'bg-amber-50 text-[#8B3A2B] border-amber-300'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#8B3A2B] shrink-0" />
            )}
          </button>

          <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200/60">
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                layout === 'grid' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-1.5 rounded-md transition-colors ${
                layout === 'list' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar & Quick Sorters */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input with Debounce */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, author, ISBN-10/13, publisher..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-stone-50 hover:bg-stone-100/60 focus:bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-900/40 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-stone-500 font-medium">
            <span className="font-mono text-stone-900 font-semibold">{totalBooks}</span> books found
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-medium focus:outline-none focus:border-amber-900/40"
            >
              <option value="relevance">Relevance / Featured</option>
              <option value="popular">Most Popular</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="title_asc">Title A–Z</option>
              <option value="title_desc">Title Z–A</option>
              <option value="author_asc">Author A–Z</option>
              <option value="newest">Newest Publication</option>
              <option value="oldest">Oldest Publication</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collection Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setSelectedCollection('all');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            selectedCollection === 'all'
              ? 'bg-[#8B3A2B] text-white shadow-2xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <span>All Volumes</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            selectedCollection === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
          }`}>358</span>
        </button>

        <button
          onClick={() => {
            setSelectedCollection('accession');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            selectedCollection === 'accession'
              ? 'bg-[#8B3A2B] text-white shadow-2xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <span>Institutional Accessions Catalog (CU Records)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            selectedCollection === 'accession' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 font-bold'
          }`}>518 Copies</span>
        </button>

        <button
          onClick={() => {
            setSelectedCollection('core');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            selectedCollection === 'core'
              ? 'bg-[#8B3A2B] text-white shadow-2xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <span>Core Curated Classics</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            selectedCollection === 'core' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
          }`}>22</span>
        </button>
      </div>

      {/* Advanced Filter Panel (Collapsible) */}
      {filterPanelOpen && (
        <div className="bg-[#FAF7F2] border border-stone-200 rounded-xl p-5 shadow-xs animate-in slide-in-from-top-2 duration-150 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#8B3A2B]" />
              <h3 className="font-serif text-sm font-semibold text-stone-900">
                Advanced Catalog Filters
              </h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-[#8B3A2B] hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Category Filter */}
            <div>
              <label className="block text-stone-600 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Discipline / Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-amber-900/40"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} ({c.book_count ?? 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-stone-600 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Copy Availability
              </label>
              <select
                value={selectedAvailability}
                onChange={(e) => {
                  setSelectedAvailability(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-amber-900/40"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available on Shelf</option>
                <option value="issued">Currently Issued / Checked Out</option>
                <option value="reserved">Under Active Hold</option>
              </select>
            </div>

            {/* Publication Era */}
            <div>
              <label className="block text-stone-600 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Publication Period
              </label>
              <select
                value={selectedYearRange}
                onChange={(e) => {
                  setSelectedYearRange(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-amber-900/40"
              >
                <option value="all">All Eras</option>
                <option value="before-2000">Historical Archive (Before 2000)</option>
                <option value="2000-2010">2000 – 2010</option>
                <option value="2010-2020">2010 – 2020</option>
                <option value="2020-plus">Recent Editions (2020+)</option>
              </select>
            </div>

            {/* Format Filter */}
            <div>
              <label className="block text-stone-600 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Physical Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => {
                  setSelectedFormat(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-amber-900/40"
              >
                <option value="all">All Formats</option>
                <option value="Hardcover">Hardcover</option>
                <option value="Paperback">Paperback</option>
                <option value="Special Edition">Special Edition</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Results Grid / List */}
      {loading ? (
        <div
          className={`grid gap-6 ${
            layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'
          }`}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-80 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <BookX className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900">
            No matching books found
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            We couldn't find any books in the catalog matching your search criteria. Try modifying your
            keywords or resetting the filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] transition-colors shadow-xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'
          }`}
        >
          {books.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              onSelect={onSelectBook}
              onRead={onOpenReader}
              layout={layout}
            />
          ))}
        </div>
      )}

      {/* Server-Side Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-stone-200/80 flex items-center justify-between">
          <p className="text-xs text-stone-500 font-medium">
            Page <span className="font-mono text-stone-900 font-semibold">{page}</span> of{' '}
            <span className="font-mono text-stone-900 font-semibold">{totalPages}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold font-mono transition-colors ${
                  page === p
                    ? 'bg-[#8B3A2B] text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
