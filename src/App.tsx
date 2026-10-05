import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomeView } from './views/HomeView.tsx';
import { CatalogView } from './views/CatalogView.tsx';
import { CategoriesView } from './views/CategoriesView.tsx';
import { AuthorsView } from './views/AuthorsView.tsx';
import { MyLibraryView } from './views/MyLibraryView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { ReaderView } from './views/ReaderView.tsx';
import { BookDetailModal } from './components/BookDetailModal.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { AboutModal } from './components/AboutModal.tsx';
import { Book, BookFilterParams } from './types.ts';
import { BookOpen, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [catalogFilters, setCatalogFilters] = useState<BookFilterParams | undefined>(undefined);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);

  const handleOpenBook = (book: Book) => {
    setSelectedBookId(book.id);
  };

  const handleOpenBookById = (bookId: string) => {
    setSelectedBookId(bookId);
  };

  const handleOpenReader = (bookId?: string | null) => {
    setReadingBookId(bookId || null);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateWithFilter = (view: string, filters?: BookFilterParams) => {
    setCatalogFilters(filters);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (categorySlug: string) => {
    handleNavigateWithFilter('catalog', { category: categorySlug });
  };

  const handleSelectAuthor = (authorId: string) => {
    handleNavigateWithFilter('catalog', { author: authorId });
  };

  const handleGlobalSearch = (query: string) => {
    handleNavigateWithFilter('catalog', { search: query });
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col font-sans selection:bg-amber-900/10 selection:text-amber-900">
        {/* Navigation Bar */}
        <Navbar
          currentView={currentView}
          setCurrentView={(v) => {
            if (v !== 'catalog') setCatalogFilters(undefined);
            if (v !== 'reader') setReadingBookId(null);
            setCurrentView(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenSearch={() => setSearchModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1">
          {currentView === 'home' && (
            <HomeView
              onSelectBook={handleOpenBook}
              onNavigate={handleNavigateWithFilter}
              onOpenReader={handleOpenReader}
            />
          )}

          {currentView === 'catalog' && (
            <CatalogView
              onSelectBook={handleOpenBook}
              initialParams={catalogFilters}
              onOpenReader={handleOpenReader}
            />
          )}

          {currentView === 'reader' && (
            <ReaderView
              initialBookId={readingBookId}
              onBackToCatalog={() => setCurrentView('catalog')}
              onSelectBook={handleOpenBook}
            />
          )}

          {currentView === 'categories' && (
            <CategoriesView onSelectCategory={handleSelectCategory} />
          )}

          {currentView === 'authors' && (
            <AuthorsView onSelectAuthor={handleSelectAuthor} />
          )}

          {currentView === 'my-library' && (
            <MyLibraryView
              onSelectBookById={handleOpenBookById}
              onExploreCatalog={() => setCurrentView('catalog')}
              onOpenReader={handleOpenReader}
            />
          )}

          {currentView === 'admin' && (
            <AdminDashboardView onSelectBook={handleOpenBook} />
          )}
        </main>

        {/* Global Modals */}
        <BookDetailModal
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
          onSelectAuthor={handleSelectAuthor}
          onOpenReader={handleOpenReader}
        />

        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelectBook={handleOpenBook}
          onViewAllResults={handleGlobalSearch}
        />

        <AboutModal
          isOpen={aboutModalOpen}
          onClose={() => setAboutModalOpen(false)}
        />

        {/* Institutional Archival Footer */}
        <footer className="border-t border-stone-200/90 bg-[#FAF7F2] text-stone-600 text-xs mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand & Provenance */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-[#8B3A2B] text-amber-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-base text-stone-900 tracking-tight">
                    ATHENAEUM
                  </span>
                </div>
                <p className="text-xs text-stone-600 max-w-sm leading-relaxed">
                  Institutional digital library repository maintaining permanent records,
                  curated academic texts, and real-time physical stack copy availability for university patrons.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono pt-1">
                  <span>SQLite Relational Engine</span>
                  <span aria-hidden="true">·</span>
                  <span>Full-Text SQL Search</span>
                  <span aria-hidden="true">·</span>
                  <span>Physical Barcodes</span>
                </div>
              </div>

              {/* Navigation Links */}
              <div>
                <h4 className="font-serif font-semibold text-stone-900 mb-3 text-sm">
                  Catalog Directory
                </h4>
                <ul className="space-y-2 text-stone-600">
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView('catalog');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-[#8B3A2B] transition-colors"
                    >
                      General Book Collection
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView('categories');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-[#8B3A2B] transition-colors"
                    >
                      Academic Disciplines
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView('authors');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-[#8B3A2B] transition-colors"
                    >
                      Authors & Theorists
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        handleOpenReader(null);
                      }}
                      className="hover:text-[#8B3A2B] transition-colors"
                    >
                      Digital Reading Room
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView('my-library');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-[#8B3A2B] transition-colors"
                    >
                      My Loans & Holds
                    </button>
                  </li>
                </ul>
              </div>

              {/* Service & Operational Ribbon */}
              <div>
                <h4 className="font-serif font-semibold text-stone-900 mb-3 text-sm">
                  Library Policies
                </h4>
                <ul className="space-y-2 text-stone-600">
                  <li>
                    <button
                      onClick={() => setAboutModalOpen(true)}
                      className="hover:text-[#8B3A2B] transition-colors text-left"
                    >
                      Circulation & Loan Rules
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setAboutModalOpen(true)}
                      className="hover:text-[#8B3A2B] transition-colors text-left"
                    >
                      Special Collections Access
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setAboutModalOpen(true)}
                      className="hover:text-[#8B3A2B] transition-colors text-left"
                    >
                      Reading Room Hours
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-600 text-[11px]">
              <p>© {new Date().getFullYear()} Athenaeum Digital Library System. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span>Designed with modern warm editorial discipline</span>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => setAboutModalOpen(true)}
                  className="hover:underline text-stone-600"
                >
                  About the Archive
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
