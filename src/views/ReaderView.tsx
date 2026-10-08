import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  List,
  Volume2,
  VolumeX,
  Highlighter,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  Share2,
  Search,
  Eye,
  Type,
  FileText,
  X,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Trash2,
} from 'lucide-react';
import { Book, BookChapter, ReaderData, ReadingProgress, BookmarkItem, HighlightItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { BookCover } from '../components/BookCover.tsx';

interface ReaderViewProps {
  initialBookId?: string | null;
  onBackToCatalog: () => void;
  onSelectBook: (book: Book) => void;
}

type PaperTheme = 'cream' | 'sepia' | 'ivory' | 'sage' | 'midnight';
type FontFamily = 'newsreader' | 'playfair' | 'cormorant' | 'sans' | 'mono';
type LineHeight = 'compact' | 'normal' | 'relaxed';
type ColumnWidth = 'narrow' | 'standard' | 'wide';

export const ReaderView: React.FC<ReaderViewProps> = ({
  initialBookId,
  onBackToCatalog,
  onSelectBook,
}) => {
  const { currentUser, showToast } = useAuth();

  // Reader state
  const [currentBookId, setCurrentBookId] = useState<string | null>(initialBookId || null);
  const [readerData, setReaderData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chapterIndex, setChapterIndex] = useState<number>(0);

  // Typography & Reading Settings
  const [paperTheme, setPaperTheme] = useState<PaperTheme>('cream');
  const [fontFamily, setFontFamily] = useState<FontFamily>('newsreader');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [columnWidth, setColumnWidth] = useState<ColumnWidth>('standard');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'toc' | 'bookmarks' | 'highlights'>('toc');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Text Selection & Annotations
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ x: number; y: number } | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [noteModalOpen, setNoteModalOpen] = useState<boolean>(false);
  const [highlightColor, setHighlightColor] = useState<'amber' | 'emerald' | 'rose' | 'sky'>('amber');

  // Text-To-Speech (Audio Narrator)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Reading Shelf (when no book is open)
  const [recentReading, setRecentReading] = useState<ReadingProgress[]>([]);
  const [shelfSearch, setShelfSearch] = useState<string>('');
  const [allBooksList, setAllBooksList] = useState<Book[]>([]);

  // Scroll & Time Tracking
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const timeSpentRef = useRef<number>(0);

  // Update current book when prop changes
  useEffect(() => {
    if (initialBookId) {
      setCurrentBookId(initialBookId);
    }
  }, [initialBookId]);

  // Load reader data when currentBookId changes
  useEffect(() => {
    if (currentBookId) {
      loadBookReader(currentBookId);
    } else {
      loadReadingShelf();
    }
  }, [currentBookId, currentUser?.id]);

  // Track reading time interval
  useEffect(() => {
    if (!currentBookId) return;
    const interval = setInterval(() => {
      timeSpentRef.current += 10;
      // Sync progress every 30 seconds
      if (timeSpentRef.current % 30 === 0 && currentUser?.id && readerData) {
        syncProgress();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [currentBookId, currentUser?.id, chapterIndex, scrollProgress, readerData]);

  // Clean up speech synthesis on unmount or chapter change
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [chapterIndex, currentBookId]);

  const loadReadingShelf = async () => {
    try {
      if (currentUser?.id) {
        const recent = await api.getRecentReading(currentUser.id);
        setRecentReading(recent);
      }
      const booksRes = await api.getBooks({ limit: 50 });
      setAllBooksList(booksRes.books || []);
    } catch (e) {
      console.error('Failed to load reading shelf:', e);
    }
  };

  const loadBookReader = async (bookId: string) => {
    setLoading(true);
    try {
      const data = await api.getReaderData(bookId, currentUser?.id);
      setReaderData(data);
      if (data.progress?.current_chapter_index !== undefined) {
        setChapterIndex(data.progress.current_chapter_index);
      } else {
        setChapterIndex(0);
      }
      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load book text', 'error');
    } finally {
      setLoading(false);
    }
  };

  const syncProgress = async () => {
    if (!currentUser?.id || !currentBookId || !readerData) return;
    try {
      const totalChapters = readerData.chapters.length || 1;
      const calculatedPercent = Math.min(
        100,
        Math.round(((chapterIndex + scrollProgress / 100) / totalChapters) * 100)
      );

      await api.saveReadingProgress({
        userId: currentUser.id,
        bookId: currentBookId,
        currentChapterIndex: chapterIndex,
        progressPercent: calculatedPercent,
        scrollPosition: scrollProgress,
        timeSpentSeconds: 30,
      });
    } catch {
      // Background sync, suppress error toast
    }
  };

  // Scroll listener for reading progress calculation
  const handleScroll = () => {
    if (!contentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
      setScrollProgress(progress);
    }
  };

  // Handle Text Selection for Highlight / Note
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionRange(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionRange({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    } else {
      setSelectionRange(null);
      setSelectedText('');
    }
  };

  // Bookmark Toggle
  const isBookmarked = readerData?.progress?.bookmarks?.some(
    (b) => b.chapter_index === chapterIndex
  );

  const handleToggleBookmark = async () => {
    if (!currentBookId || !currentUser?.id) {
      showToast('Please sign in to save bookmarks', 'info');
      return;
    }
    const currentChapter = readerData?.chapters[chapterIndex];
    if (!currentChapter) return;

    if (isBookmarked) {
      const bm = readerData?.progress?.bookmarks?.find((b) => b.chapter_index === chapterIndex);
      if (bm) {
        await api.deleteBookmark(currentUser.id, currentBookId, bm.id);
        setReaderData((prev) =>
          prev && prev.progress
            ? {
                ...prev,
                progress: {
                  ...prev.progress,
                  bookmarks: prev.progress.bookmarks.filter((b) => b.id !== bm.id),
                },
              }
            : prev
        );
        showToast('Bookmark removed', 'info');
      }
    } else {
      const excerpt = currentChapter.content.slice(0, 140) + '...';
      const res = await api.addBookmark({
        userId: currentUser.id,
        bookId: currentBookId,
        chapterIndex,
        chapterTitle: currentChapter.title,
        excerpt,
      });
      setReaderData((prev) =>
        prev
          ? {
              ...prev,
              progress: {
                ...(prev.progress || {
                  user_id: currentUser.id,
                  book_id: currentBookId,
                  current_chapter_index: chapterIndex,
                  progress_percent: 0,
                  scroll_position: 0,
                  total_reading_time_seconds: 0,
                  bookmarks: [],
                  highlights: [],
                }),
                bookmarks: [...(prev.progress?.bookmarks || []), res.bookmark],
              },
            }
          : prev
      );
      showToast('Page bookmarked', 'success');
    }
  };

  // Highlight Selection
  const handleSaveHighlight = async (color: 'amber' | 'emerald' | 'rose' | 'sky', note = '') => {
    if (!currentBookId || !currentUser?.id || !selectedText) {
      showToast('Please sign in to save annotations', 'info');
      return;
    }
    try {
      const res = await api.addHighlight({
        userId: currentUser.id,
        bookId: currentBookId,
        chapterIndex,
        text: selectedText,
        color,
        note,
      });

      setReaderData((prev) =>
        prev
          ? {
              ...prev,
              progress: {
                ...(prev.progress || {
                  user_id: currentUser.id,
                  book_id: currentBookId,
                  current_chapter_index: chapterIndex,
                  progress_percent: 0,
                  scroll_position: 0,
                  total_reading_time_seconds: 0,
                  bookmarks: [],
                  highlights: [],
                }),
                highlights: [...(prev.progress?.highlights || []), res.highlight],
              },
            }
          : prev
      );

      showToast(note ? 'Annotation saved' : 'Passage highlighted', 'success');
      setSelectionRange(null);
      setSelectedText('');
      setNoteModalOpen(false);
      setNewNoteText('');
      window.getSelection()?.removeAllRanges();
    } catch {
      showToast('Failed to save highlight', 'error');
    }
  };

  // Delete Highlight
  const handleDeleteHighlight = async (highlightId: string) => {
    if (!currentBookId || !currentUser?.id) return;
    try {
      await api.deleteHighlight(currentUser.id, currentBookId, highlightId);
      setReaderData((prev) =>
        prev && prev.progress
          ? {
              ...prev,
              progress: {
                ...prev.progress,
                highlights: prev.progress.highlights.filter((h) => h.id !== highlightId),
              },
            }
          : prev
      );
      showToast('Highlight removed', 'info');
    } catch {
      showToast('Failed to delete highlight', 'error');
    }
  };

  // Text-To-Speech Narrator
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Audio narration is not supported in this browser', 'error');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const currentChapter = readerData?.chapters[chapterIndex];
      if (!currentChapter) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${currentChapter.title}. ${currentChapter.subtitle || ''}. ${currentChapter.content}`
      );
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      showToast('Audio narrator playing', 'info');
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Chapter Navigation
  const goToNextChapter = () => {
    if (readerData && chapterIndex < readerData.chapters.length - 1) {
      setChapterIndex((prev) => prev + 1);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevChapter = () => {
    if (chapterIndex > 0) {
      setChapterIndex((prev) => prev - 1);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Theme Styles
  const themeStyles: Record<
    PaperTheme,
    {
      bg: string;
      text: string;
      subtext: string;
      accent: string;
      card: string;
      border: string;
      selection: string;
    }
  > = {
    cream: {
      bg: 'bg-[#FDFBF7]',
      text: 'text-stone-900',
      subtext: 'text-stone-600',
      accent: 'text-[#8B3A2B]',
      card: 'bg-white',
      border: 'border-stone-200/90',
      selection: 'selection:bg-amber-100 selection:text-amber-900',
    },
    sepia: {
      bg: 'bg-[#F5EEDC]',
      text: 'text-[#3E2723]',
      subtext: 'text-[#5D4037]',
      accent: 'text-[#6D4C41]',
      card: 'bg-[#FBF6EA]',
      border: 'border-[#E0D5BE]',
      selection: 'selection:bg-[#D7CCC8] selection:text-[#3E2723]',
    },
    ivory: {
      bg: 'bg-[#FFFFFF]',
      text: 'text-stone-950',
      subtext: 'text-stone-600',
      accent: 'text-stone-900',
      card: 'bg-stone-50',
      border: 'border-stone-200',
      selection: 'selection:bg-stone-200 selection:text-stone-900',
    },
    sage: {
      bg: 'bg-[#EFF2ED]',
      text: 'text-[#1F2E23]',
      subtext: 'text-[#3B4E41]',
      accent: 'text-[#2D5A3C]',
      card: 'bg-[#F8FAF7]',
      border: 'border-[#D4DDD1]',
      selection: 'selection:bg-[#C8D6C3] selection:text-[#1F2E23]',
    },
    midnight: {
      bg: 'bg-[#181615]',
      text: 'text-[#EFECE6]',
      subtext: 'text-[#A8A29E]',
      accent: 'text-[#E0A96D]',
      card: 'bg-[#221F1E]',
      border: 'border-stone-800',
      selection: 'selection:bg-amber-900/60 selection:text-amber-100',
    },
  };

  const currentTheme = themeStyles[paperTheme];

  const fontClass =
    fontFamily === 'newsreader'
      ? 'font-serif'
      : fontFamily === 'playfair'
      ? 'font-serif'
      : fontFamily === 'cormorant'
      ? 'font-serif'
      : fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const widthClass =
    columnWidth === 'narrow' ? 'max-w-2xl' : columnWidth === 'standard' ? 'max-w-3xl' : 'max-w-5xl';

  const leadingClass =
    lineHeight === 'compact' ? 'leading-relaxed' : lineHeight === 'normal' ? 'leading-loose' : 'leading-extra-loose';

  // -------------------------------------------------------------
  // VIEW A: READING ROOM CATALOG & CONTINUE READING SHELF
  // (Rendered when no book is currently loaded)
  // -------------------------------------------------------------
  if (!currentBookId) {
    const filteredShelfBooks = allBooksList.filter((b) =>
      b.title.toLowerCase().includes(shelfSearch.toLowerCase()) ||
      (b.authors && b.authors.some((a) => a.name.toLowerCase().includes(shelfSearch.toLowerCase())))
    );

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 text-amber-900 text-xs font-semibold tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Digital Reading Room</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight">
            Read Online in Distraction-Free Solitude
          </h1>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            Immerse yourself in our collection of classic texts, foundational manuscripts, and academic volumes.
            Tailor paper tints, fine typography, audio narration, and annotate margins.
          </p>

          {/* Quick Search */}
          <div className="pt-2 max-w-lg mx-auto relative">
            <Search className="w-4 h-4 text-stone-600 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={shelfSearch}
              onChange={(e) => setShelfSearch(e.target.value)}
              placeholder="Search books to read instantly..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-full text-xs sm:text-sm text-stone-900 placeholder-stone-600 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#8B3A2B]/20 focus:border-[#8B3A2B] transition-all"
            />
          </div>
        </div>

        {/* 1. Continue Reading Shelf (If user has progress) */}
        {recentReading.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8B3A2B]" />
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Continue Reading
                </h2>
              </div>
              <span className="text-xs text-stone-600 font-mono">
                {recentReading.length} volume{recentReading.length > 1 ? 's' : ''} in progress
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentReading.map((item) => (
                <div
                  key={item.id || item.book_id}
                  className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex gap-4 items-center group cursor-pointer"
                  onClick={() => setCurrentBookId(item.book_id)}
                >
                  <div className="w-16 h-22 shrink-0 rounded-md overflow-hidden shadow-xs">
                    <BookCover
                      title={item.book?.title || 'Book'}
                      authorName={item.book?.author_name}
                      categorySlug={item.book?.category_slug}
                      categoryColor={item.book?.category_color}
                      coverImageUrl={item.book?.cover_image_url}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="text-[10px] uppercase font-semibold text-[#8B3A2B] tracking-wider block truncate">
                      {item.book?.category_name || 'Academic Text'}
                    </span>
                    <h3 className="font-serif font-bold text-stone-900 text-sm truncate group-hover:text-[#8B3A2B] transition-colors">
                      {item.book?.title}
                    </h3>
                    <p className="text-xs text-stone-600 truncate">
                      {item.book?.author_name || 'Author'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-stone-600 font-mono">
                        <span>Chapter {(item.current_chapter_index || 0) + 1}</span>
                        <span>{item.progress_percent || 0}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#8B3A2B] h-full rounded-full transition-all"
                          style={{ width: `${Math.max(5, item.progress_percent || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Curated Reading Masterworks Shelf */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Foundational Masterworks & Stacks
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Complete digitised volumes ready for instant full-text reader immersion
              </p>
            </div>
            <button
              onClick={onBackToCatalog}
              className="text-xs text-[#8B3A2B] hover:text-[#732F23] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Explore All Books</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredShelfBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setCurrentBookId(book.id)}
              >
                <div className="aspect-2/3 rounded-lg overflow-hidden shadow-xs mb-3 group-hover:scale-102 transition-transform">
                  <BookCover
                    title={book.title}
                    authorName={book.authors?.[0]?.name}
                    categorySlug={book.category_slug}
                    categoryColor={book.category_color}
                    coverImageUrl={book.cover_image_url}
                    className="w-full h-full"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-stone-600 uppercase font-semibold block truncate">
                    {book.category_name || 'Academic'}
                  </span>
                  <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm line-clamp-2 group-hover:text-[#8B3A2B] transition-colors leading-snug">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-stone-600 truncate">
                    {book.authors?.[0]?.name || 'Author'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBookId(book.id);
                  }}
                  className="mt-3 w-full py-1.5 px-2 bg-stone-100 hover:bg-[#8B3A2B] text-stone-700 hover:text-white rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Read Book</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: ACTIVE DIGITAL READER MANUSCRIPT VIEW
  // (Rendered when a book is being read)
  // -------------------------------------------------------------
  const currentChapter = readerData?.chapters[chapterIndex];
  const totalChapters = readerData?.chapters.length || 1;
  const progressPercent = Math.round(((chapterIndex + 1) / totalChapters) * 100);

  return (
    <div
      className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} ${currentTheme.selection} transition-colors duration-300 flex flex-col relative`}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP READER TOOLBAR */}
      <header
        className={`sticky top-0 z-30 ${currentTheme.bg}/95 backdrop-blur-md border-b ${currentTheme.border} transition-colors`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          {/* Left: Back & Table of Contents Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentBookId(null)}
              className={`p-2 rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1.5 text-xs font-semibold ${currentTheme.accent}`}
              title="Return to Reading Room Shelf"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Reading Room</span>
            </button>

            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors text-xs font-medium flex items-center gap-1.5"
              title="Table of Contents & Highlights"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Index & Notes</span>
            </button>
          </div>

          {/* Center: Book & Chapter Breadcrumb */}
          <div className="text-center min-w-0 max-w-md hidden sm:block">
            <h2 className="font-serif font-bold text-xs truncate">
              {readerData?.book.title}
            </h2>
            <div className="flex items-center justify-center gap-2 text-[11px] opacity-75">
              <span>Chapter {chapterIndex + 1} of {totalChapters}</span>
              <span>·</span>
              <span>{currentChapter?.reading_minutes || 6} min read</span>
            </div>
          </div>

          {/* Right: Audio Narrator, Bookmark, Typography & Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Audio Narrator */}
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-lg transition-colors ${
                isSpeaking
                  ? 'bg-[#8B3A2B] text-white shadow-xs animate-pulse'
                  : 'hover:bg-black/5 opacity-80 hover:opacity-100'
              }`}
              title={isSpeaking ? 'Pause Audio Narrator' : 'Listen to Chapter with Audio Narrator'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Bookmark Toggle */}
            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-[#8B3A2B] bg-amber-500/10'
                  : 'hover:bg-black/5 opacity-80 hover:opacity-100'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-current text-[#8B3A2B]" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Typography Settings */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`p-2 rounded-lg hover:bg-black/5 transition-colors ${
                settingsOpen ? 'bg-black/10' : ''
              }`}
              title="Typography & Appearance Settings"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors hidden md:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Reading'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Scroll / Progress Bar at top of header */}
        <div className="w-full bg-black/5 h-0.5">
          <div
            className="bg-[#8B3A2B] h-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* 2. TYPOGRAPHY & APPEARANCE DRAWER / POPOVER */}
      {settingsOpen && (
        <div
          className={`absolute top-15 right-4 sm:right-8 z-40 w-80 p-5 rounded-2xl ${currentTheme.card} border ${currentTheme.border} shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="font-serif font-bold text-xs uppercase tracking-wider">
              Reading Appearance
            </span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded-md hover:bg-black/5 opacity-70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Paper Theme Picker */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold opacity-75 uppercase tracking-wider block">
              Paper Tone
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'cream', name: 'Cream', bg: 'bg-[#FDFBF7]', border: 'border-stone-300' },
                { id: 'sepia', name: 'Sepia', bg: 'bg-[#F5EEDC]', border: 'border-[#D7CCC8]' },
                { id: 'ivory', name: 'Ivory', bg: 'bg-[#FFFFFF]', border: 'border-stone-300' },
                { id: 'sage', name: 'Sage', bg: 'bg-[#EFF2ED]', border: 'border-[#C8D6C3]' },
                { id: 'midnight', name: 'Dark', bg: 'bg-[#181615]', border: 'border-stone-700' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPaperTheme(t.id as PaperTheme)}
                  className={`h-9 rounded-lg ${t.bg} border-2 ${
                    paperTheme === t.id ? 'border-[#8B3A2B] ring-2 ring-[#8B3A2B]/20 scale-105' : t.border
                  } transition-all flex items-center justify-center shadow-xs`}
                  title={t.name}
                >
                  <span className={`text-[10px] font-bold ${t.id === 'midnight' ? 'text-stone-300' : 'text-stone-800'}`}>
                    {t.name[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family Picker */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold opacity-75 uppercase tracking-wider block">
              Typeface
            </label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <button
                onClick={() => setFontFamily('newsreader')}
                className={`py-1.5 px-2 rounded-lg border text-center font-serif transition-colors ${
                  fontFamily === 'newsreader' ? 'bg-[#8B3A2B] text-white border-[#8B3A2B]' : 'hover:bg-black/5 border-black/10'
                }`}
              >
                Editorial
              </button>
              <button
                onClick={() => setFontFamily('sans')}
                className={`py-1.5 px-2 rounded-lg border text-center font-sans transition-colors ${
                  fontFamily === 'sans' ? 'bg-[#8B3A2B] text-white border-[#8B3A2B]' : 'hover:bg-black/5 border-black/10'
                }`}
              >
                Clean Sans
              </button>
              <button
                onClick={() => setFontFamily('mono')}
                className={`py-1.5 px-2 rounded-lg border text-center font-mono transition-colors ${
                  fontFamily === 'mono' ? 'bg-[#8B3A2B] text-white border-[#8B3A2B]' : 'hover:bg-black/5 border-black/10'
                }`}
              >
                Monospace
              </button>
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-semibold opacity-75">
              <span>Text Scale</span>
              <span className="font-mono">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif">A</span>
              <input
                type="range"
                min="14"
                max="26"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-[#8B3A2B]"
              />
              <span className="text-lg font-serif">A</span>
            </div>
          </div>

          {/* Column Width & Line Spacing */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-black/10">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold opacity-75 uppercase block">Width</label>
              <div className="flex rounded-md border border-black/10 p-0.5 text-xs">
                {(['narrow', 'standard', 'wide'] as ColumnWidth[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setColumnWidth(w)}
                    className={`flex-1 py-1 text-[11px] rounded transition-colors ${
                      columnWidth === w ? 'bg-[#8B3A2B] text-white font-semibold' : 'hover:bg-black/5'
                    }`}
                  >
                    {w[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold opacity-75 uppercase block">Spacing</label>
              <div className="flex rounded-md border border-black/10 p-0.5 text-xs">
                {(['compact', 'normal', 'relaxed'] as LineHeight[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLineHeight(l)}
                    className={`flex-1 py-1 text-[11px] rounded transition-colors ${
                      lineHeight === l ? 'bg-[#8B3A2B] text-white font-semibold' : 'hover:bg-black/5'
                    }`}
                  >
                    {l === 'compact' ? '1.5' : l === 'normal' ? '1.8' : '2.0'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FLOATING HIGHLIGHT & ANNOTATION TOOLBAR */}
      {selectionRange && (
        <div
          style={{ top: `${selectionRange.y}px`, left: `${selectionRange.x}px` }}
          className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2 bg-stone-900 text-white rounded-xl px-2 py-1.5 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => handleSaveHighlight('amber')}
            className="w-5 h-5 rounded-full bg-amber-400 hover:scale-115 transition-transform"
            title="Highlight Amber"
          />
          <button
            onClick={() => handleSaveHighlight('emerald')}
            className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-115 transition-transform"
            title="Highlight Emerald"
          />
          <button
            onClick={() => handleSaveHighlight('rose')}
            className="w-5 h-5 rounded-full bg-rose-400 hover:scale-115 transition-transform"
            title="Highlight Rose"
          />
          <button
            onClick={() => handleSaveHighlight('sky')}
            className="w-5 h-5 rounded-full bg-sky-400 hover:scale-115 transition-transform"
            title="Highlight Sky"
          />
          <div className="w-px h-4 bg-stone-700 mx-0.5" />
          <button
            onClick={() => setNoteModalOpen(true)}
            className="text-xs px-2 py-0.5 rounded hover:bg-stone-800 flex items-center gap-1 text-amber-200"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Note</span>
          </button>
        </div>
      )}

      {/* 4. NOTE MODAL */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-2xl text-stone-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="font-serif font-bold text-sm text-[#8B3A2B] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>Attach Marginal Annotation</span>
              </span>
              <button onClick={() => setNoteModalOpen(false)} className="p-1 text-stone-600 hover:text-stone-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs italic text-stone-600 line-clamp-3">
              "{selectedText}"
            </div>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write your scholarly reflection or note..."
              rows={3}
              className="w-full text-xs p-3 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B3A2B]/20 focus:border-[#8B3A2B]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNoteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveHighlight('amber', newNoteText)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] rounded-lg shadow-xs"
              >
                Save Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TABLE OF CONTENTS & NOTES SIDEBAR (DRAWER) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs" onClick={() => setSidebarOpen(false)} />
          <div
            className={`relative z-10 w-80 sm:w-96 h-full ${currentTheme.card} border-r ${currentTheme.border} shadow-2xl flex flex-col`}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-black/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#8B3A2B]" />
                <h3 className="font-serif font-bold text-sm truncate max-w-[200px]">
                  {readerData?.book.title}
                </h3>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-black/5 opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Tabs */}
            <div className="flex border-b border-black/10 text-xs font-semibold">
              <button
                onClick={() => setActiveSidebarTab('toc')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                  activeSidebarTab === 'toc'
                    ? 'border-[#8B3A2B] text-[#8B3A2B]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                Contents ({totalChapters})
              </button>
              <button
                onClick={() => setActiveSidebarTab('bookmarks')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                  activeSidebarTab === 'bookmarks'
                    ? 'border-[#8B3A2B] text-[#8B3A2B]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                Bookmarks ({readerData?.progress?.bookmarks?.length || 0})
              </button>
              <button
                onClick={() => setActiveSidebarTab('highlights')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                  activeSidebarTab === 'highlights'
                    ? 'border-[#8B3A2B] text-[#8B3A2B]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                Notes ({readerData?.progress?.highlights?.length || 0})
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeSidebarTab === 'toc' && (
                <div className="space-y-1">
                  {readerData?.chapters.map((ch, idx) => (
                    <button
                      key={ch.id || idx}
                      onClick={() => {
                        setChapterIndex(idx);
                        setSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full p-3 text-left rounded-xl transition-all flex items-start justify-between gap-3 ${
                        chapterIndex === idx
                          ? 'bg-[#8B3A2B]/10 font-bold text-[#8B3A2B] shadow-2xs'
                          : 'hover:bg-black/5 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] uppercase font-mono opacity-70 block">
                          Chapter {idx + 1}
                        </span>
                        <h5 className="font-serif text-xs line-clamp-1 leading-snug">
                          {ch.title}
                        </h5>
                        {ch.subtitle && (
                          <p className="text-[10px] opacity-70 line-clamp-1">{ch.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono opacity-60 whitespace-nowrap pt-1">
                        {ch.reading_minutes || 5}m
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeSidebarTab === 'bookmarks' && (
                <div className="space-y-2">
                  {(!readerData?.progress?.bookmarks || readerData.progress.bookmarks.length === 0) ? (
                    <div className="text-center py-10 opacity-60 text-xs">
                      <Bookmark className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>No saved bookmarks yet</p>
                      <p className="text-[10px] mt-1">Click the bookmark icon in the top toolbar to mark pages</p>
                    </div>
                  ) : (
                    readerData.progress.bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="p-3 rounded-xl border border-black/10 bg-black/5 space-y-1.5 text-xs group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-[#8B3A2B]">
                            {bm.chapter_title}
                          </span>
                          <button
                            onClick={() => {
                              if (currentUser?.id && currentBookId) {
                                api.deleteBookmark(currentUser.id, currentBookId, bm.id);
                                setReaderData((prev) =>
                                  prev && prev.progress
                                    ? {
                                        ...prev,
                                        progress: {
                                          ...prev.progress,
                                          bookmarks: prev.progress.bookmarks.filter((b) => b.id !== bm.id),
                                        },
                                      }
                                    : prev
                                );
                              }
                            }}
                            className="text-red-600 hover:text-red-800 opacity-60 hover:opacity-100 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {bm.excerpt && (
                          <p className="text-[11px] opacity-80 italic line-clamp-2">
                            "{bm.excerpt}"
                          </p>
                        )}
                        <button
                          onClick={() => {
                            setChapterIndex(bm.chapter_index);
                            setSidebarOpen(false);
                          }}
                          className="text-[10px] font-semibold text-[#8B3A2B] hover:underline block pt-1"
                        >
                          Jump to Chapter →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSidebarTab === 'highlights' && (
                <div className="space-y-2">
                  {(!readerData?.progress?.highlights || readerData.progress.highlights.length === 0) ? (
                    <div className="text-center py-10 opacity-60 text-xs">
                      <Highlighter className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>No highlights or notes recorded</p>
                      <p className="text-[10px] mt-1">Select any passage in the text to highlight or annotate</p>
                    </div>
                  ) : (
                    readerData.progress.highlights.map((hl) => (
                      <div
                        key={hl.id}
                        className="p-3 rounded-xl border border-black/10 bg-black/5 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono opacity-70">
                            Chapter {hl.chapter_index + 1}
                          </span>
                          <button
                            onClick={() => handleDeleteHighlight(hl.id)}
                            className="text-red-600 hover:text-red-800 opacity-60 hover:opacity-100 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] font-serif border-l-2 border-[#8B3A2B] pl-2 italic">
                          "{hl.text}"
                        </p>
                        {hl.note && (
                          <div className="p-2 bg-black/5 rounded-md text-[11px] text-stone-700">
                            <strong>Note:</strong> {hl.note}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. PRIMARY READING CANVAS */}
      <main
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex flex-col items-center"
      >
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-[#8B3A2B] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-serif text-base italic opacity-75">Opening archival volume...</p>
          </div>
        ) : (
          <article className={`w-full ${widthClass} space-y-10 transition-all duration-200`}>
            {/* Chapter Header */}
            <header className="space-y-4 text-center border-b border-black/10 pb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-mono tracking-wider uppercase opacity-80">
                <span>Chapter {chapterIndex + 1} of {totalChapters}</span>
                <span>·</span>
                <span>{currentChapter?.word_count || 450} words</span>
              </div>

              <h1 className={`${fontClass} text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight`}>
                {currentChapter?.title || 'Chapter Title'}
              </h1>

              {currentChapter?.subtitle && (
                <p className={`${fontClass} text-base sm:text-lg italic opacity-80 max-w-xl mx-auto leading-relaxed`}>
                  {currentChapter.subtitle}
                </p>
              )}
            </header>

            {/* Chapter Text Body with Drop-Cap Styling */}
            <div
              className={`${fontClass} ${leadingClass} text-justify space-y-6 select-text`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {currentChapter?.content.split('\n\n').map((paragraph, pIdx) => {
                const isFirst = pIdx === 0;

                // Render blockquotes or lists if markdown formatted
                if (paragraph.startsWith('**') || paragraph.startsWith('1.') || paragraph.startsWith('- ')) {
                  return (
                    <div
                      key={pIdx}
                      className="my-4 p-4 rounded-xl bg-black/5 border-l-3 border-[#8B3A2B] space-y-2 text-[0.95em]"
                    >
                      {paragraph.split('\n').map((line, lIdx) => (
                        <p key={lIdx}>{line}</p>
                      ))}
                    </div>
                  );
                }

                if (paragraph.startsWith('    ')) {
                  // Indented formula or equation block
                  return (
                    <div
                      key={pIdx}
                      className="my-6 p-4 rounded-xl font-mono text-center bg-black/5 border border-black/10 text-[0.9em]"
                    >
                      {paragraph.trim()}
                    </div>
                  );
                }

                return (
                  <p
                    key={pIdx}
                    className={`${
                      isFirst
                        ? 'first-letter:font-serif first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:font-bold first-letter:leading-none first-letter:text-[#8B3A2B]'
                        : ''
                    }`}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* End of Chapter Flourish & Marginal Notes */}
            <div className="pt-10 border-t border-black/10 flex flex-col items-center space-y-6">
              <div className="flex items-center gap-2 opacity-50">
                <span className="w-12 h-px bg-current" />
                <span className="font-serif text-sm">❧</span>
                <span className="w-12 h-px bg-current" />
              </div>

              {/* Bottom Chapter Pager Navigation */}
              <div className="w-full flex items-center justify-between gap-4 pt-4">
                <button
                  onClick={goToPrevChapter}
                  disabled={chapterIndex === 0}
                  className={`px-4 py-2.5 rounded-xl border border-black/15 text-xs font-semibold flex items-center gap-2 transition-all ${
                    chapterIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 hover:scale-102'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous Chapter</span>
                  <span className="sm:hidden">Prev</span>
                </button>

                <div className="text-center font-mono text-xs opacity-70">
                  {chapterIndex + 1} / {totalChapters}
                </div>

                <button
                  onClick={goToNextChapter}
                  disabled={chapterIndex >= totalChapters - 1}
                  className={`px-4 py-2.5 rounded-xl border border-black/15 text-xs font-semibold flex items-center gap-2 transition-all ${
                    chapterIndex >= totalChapters - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-black/5 hover:scale-102 bg-[#8B3A2B] text-white border-transparent'
                  }`}
                >
                  <span className="hidden sm:inline">Next Chapter</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};
