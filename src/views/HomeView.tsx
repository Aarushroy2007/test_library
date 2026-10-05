import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  TrendingUp,
  BookmarkCheck,
  Compass,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { Book, LibraryStats, Category } from '../types.ts';
import { BookCard } from '../components/BookCard.tsx';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface HomeViewProps {
  onSelectBook: (book: Book) => void;
  onNavigate: (view: string, filterParams?: any) => void;
  onOpenReader?: (bookId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectBook, onNavigate, onOpenReader }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHomeData();
  }, [currentUser?.id]);

  const loadHomeData = async () => {
    setLoading(true);
    try {
      const [statsData, featuredData, categoriesData] = await Promise.all([
        api.getStats(),
        api.getFeaturedBooks(currentUser?.id),
        api.getCategories(),
      ]);
      setStats(statsData);
      setFeaturedBooks(featuredData);
      setCategories(categoriesData);
    } catch (e) {
      console.error('Error loading home data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() !== '') {
      onNavigate('catalog', { search: searchQuery.trim() });
    } else {
      onNavigate('catalog');
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-16 border-b border-stone-200/80 bg-gradient-to-b from-[#FAF7F2] to-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Institutional subtext badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/5 text-[#8B3A2B] text-xs font-medium tracking-wide mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Academic & Speculative Collection</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
            Discover Your Next Great Read
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Explore thousands of books, discover new authors, and access physical library copies
            with real-time shelf tracking and seamless borrowing.
          </p>

          {/* Prominent Database Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="mt-8 sm:mt-10 max-w-2xl mx-auto bg-white rounded-2xl p-2 sm:p-2.5 shadow-lg border border-stone-200/90 flex items-center gap-2"
          >
            <div className="pl-3 text-stone-400">
              <Search className="w-5 h-5 text-stone-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books, authors, ISBN, or keywords..."
              className="flex-1 bg-transparent border-none text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0 px-2"
            />
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
            <button
              type="submit"
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#8B3A2B] hover:bg-[#732F23] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs shrink-0"
            >
              Search Catalog
            </button>
          </form>

          {/* Popular Search Suggestions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
            <span className="font-medium text-stone-400">Popular searches:</span>
            {['Knuth', 'Feynman', 'Cosmos', 'Stoicism', 'Ada Lovelace'].map((item) => (
              <button
                key={item}
                onClick={() => onNavigate('catalog', { search: item })}
                className="hover:text-[#8B3A2B] hover:underline transition-colors text-stone-600"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. QUICK DYNAMIC STATISTICS (Calculated from SQLite database) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-5">
          <div className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-900/20 transition-all">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
              Total Titles
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1 tabular-nums">
              {stats?.totalBooks ?? '—'}
            </div>
            <p className="text-[11px] text-stone-600 mt-1">Cataloged in database</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-900/20 transition-all">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
              Available Copies
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-800 mt-1 tabular-nums">
              {stats?.availableCopies ?? '—'}
            </div>
            <p className="text-[11px] text-stone-600 mt-1">Ready for checkout</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-900/20 transition-all">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
              Issued Copies
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-900 mt-1 tabular-nums">
              {stats?.issuedCopies ?? '—'}
            </div>
            <p className="text-[11px] text-stone-600 mt-1">In active patron hands</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-900/20 transition-all">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
              Authors
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1 tabular-nums">
              {stats?.authorsCount ?? '—'}
            </div>
            <p className="text-[11px] text-stone-600 mt-1">Represented scholars</p>
          </div>

          <div className="col-span-2 md:col-span-1 bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-900/20 transition-all">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
              Categories
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1 tabular-nums">
              {stats?.categoriesCount ?? '—'}
            </div>
            <p className="text-[11px] text-stone-600 mt-1">Academic disciplines</p>
          </div>
        </div>
      </section>

      {/* 3. FEATURED BOOKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-semibold tracking-wider uppercase text-[#8B3A2B] mb-1">
              Curator’s Selection
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Featured Books
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-xl">
              Essential masterworks in computer science, theoretical physics, philosophy, and enduring prose.
            </p>
          </div>

          <button
            onClick={() => onNavigate('catalog')}
            className="self-start sm:self-auto text-xs font-semibold text-[#8B3A2B] hover:text-stone-900 flex items-center gap-1.5 transition-colors group"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBooks.slice(0, 8).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={onSelectBook}
                onRead={onOpenReader}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. EXPLORE BY CATEGORY CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Explore Disciplines
            </h2>
            <p className="text-sm text-stone-600 mt-0.5">
              Navigate the library by foundational domain and academic division.
            </p>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="text-xs font-semibold text-[#8B3A2B] hover:underline flex items-center gap-1"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('catalog', { category: cat.slug })}
              className="group bg-white border border-stone-200/90 rounded-xl p-5 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-amber-900/40 flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white mb-3 text-xs font-bold"
                  style={{ backgroundColor: cat.accent_color || '#8B3A2B' }}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-[#8B3A2B] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono font-medium">{cat.book_count ?? 0} titles</span>
                <span className="text-[#8B3A2B] group-hover:translate-x-0.5 transition-transform">
                  Browse →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INSTITUTIONAL READING HOURS & SERVICES RIBBON */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF7F2] border border-stone-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              The Athenaeum Reading Rooms & Special Archives
            </h3>
            <p className="text-xs sm:text-sm text-stone-600">
              Stack Access: Mon–Fri 08:00–22:00 · Saturday 10:00–18:00 · Special Collections by Appointment
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (onOpenReader) onOpenReader('');
                else onNavigate('reader');
              }}
              className="px-4 py-2 rounded-lg bg-amber-900/10 border border-amber-900/20 text-xs font-semibold text-[#8B3A2B] hover:bg-amber-900/15 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Enter Digital Reading Room</span>
            </button>
            <button
              onClick={() => onNavigate('catalog', { availability: 'available' })}
              className="px-4 py-2 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
            >
              Browse Available Titles
            </button>
            <button
              onClick={() => onNavigate('my-library')}
              className="px-4 py-2 rounded-lg bg-[#8B3A2B] text-white text-xs font-medium hover:bg-[#732F23] transition-colors shadow-xs"
            >
              My Patron Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
