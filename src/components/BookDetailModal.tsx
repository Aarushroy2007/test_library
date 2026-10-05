import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Heart,
  Share2,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Calendar,
  Building,
  Globe,
  FileText,
  Bookmark,
  Check,
} from 'lucide-react';
import { Book, BookCopy } from '../types.ts';
import { BookCover } from './BookCover.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface BookDetailModalProps {
  bookId: string | null;
  onClose: () => void;
  onBookUpdated?: () => void;
  onSelectAuthor?: (authorId: string) => void;
  onOpenReader?: (bookId: string) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  bookId,
  onClose,
  onBookUpdated,
  onSelectAuthor,
  onOpenReader,
}) => {
  const { currentUser, showToast, isLibrarianOrAdmin } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    loadBookDetails();
  }, [bookId, currentUser?.id]);

  const loadBookDetails = async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const data = await api.getBookById(bookId, currentUser?.id);
      setBook(data);
      // Select first available copy by default if any
      const availableCopy = data.copies?.find((c) => c.status === 'AVAILABLE');
      if (availableCopy) {
        setSelectedCopyId(availableCopy.id);
      }
    } catch {
      showToast('Could not load book details from database.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!bookId) return null;

  const handleBorrow = async () => {
    if (!book) return;
    if (!currentUser) {
      showToast('Please sign in or select a test patron to borrow books.', 'info');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.borrowBook(book.id, currentUser.id, selectedCopyId || undefined);
      showToast(res.message, 'success');
      await loadBookDetails();
      if (onBookUpdated) onBookUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to borrow book.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (borrowingId: string) => {
    setActionLoading(true);
    try {
      const res = await api.returnBook({ borrowingId });
      showToast(res.message, 'success');
      await loadBookDetails();
      if (onBookUpdated) onBookUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to return book.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async (borrowingId: string) => {
    setActionLoading(true);
    try {
      const res = await api.renewLoan(borrowingId);
      showToast(res.message, 'success');
      await loadBookDetails();
      if (onBookUpdated) onBookUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to renew loan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!book) return;
    if (!currentUser) {
      showToast('Please sign in or select a test patron to place holds.', 'info');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.reserveBook(book.id, currentUser.id);
      showToast(res.message, 'success');
      await loadBookDetails();
      if (onBookUpdated) onBookUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to place reservation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    setActionLoading(true);
    try {
      const res = await api.cancelReservation(resId);
      showToast(res.message, 'info');
      await loadBookDetails();
      if (onBookUpdated) onBookUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel reservation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!book || !currentUser) {
      showToast('Please sign in to save books.', 'info');
      return;
    }
    try {
      const res = await api.toggleFavorite(currentUser.id, book.id);
      setBook((prev) => (prev ? { ...prev, is_favorite: res.favorited } : null));
      showToast(res.message, 'success');
      if (onBookUpdated) onBookUpdated();
    } catch {
      showToast('Failed to update favorite.', 'error');
    }
  };

  const handleShare = () => {
    if (!book) return;
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    showToast('Catalog link copied to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const authorName = book?.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
  const availableCopies = book?.available_copies ?? 0;
  const totalCopies = book?.total_copies ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !book ? (
          /* Skeleton Loader */
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-amber-900/20 border-t-amber-900 animate-spin" />
            <p className="text-sm font-serif italic text-stone-500">
              Retrieving catalog record from archive database...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Presentation: Book Cover & Essential Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-7">
              {/* Cover Column */}
              <div className="md:col-span-4 flex flex-col items-center sm:items-start">
                <BookCover
                  title={book.title}
                  authorName={authorName}
                  categorySlug={book.category_slug}
                  coverImageUrl={book.cover_image_url}
                  size="lg"
                  className="shadow-xl"
                />

                {/* Physical Location Marker */}
                <div className="mt-5 w-full bg-[#FAF7F2] border border-stone-200/80 rounded-xl p-3.5 text-xs text-stone-700">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8B3A2B]" />
                    <span>Physical Location</span>
                  </div>
                  <div className="space-y-1 text-stone-600">
                    <p className="flex justify-between">
                      <span className="font-medium">Shelf:</span>
                      <span className="font-mono text-stone-900">{book.shelf_number || 'A-12'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium">Section:</span>
                      <span className="text-right truncate ml-2 text-stone-900">{book.section || 'General Reading'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium">Floor:</span>
                      <span className="text-stone-900">Level {book.floor || 1}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information Column */}
              <div className="md:col-span-8 flex flex-col justify-between">
                <div>
                  {/* Category & Status */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 mb-2">
                    <span className="font-medium text-[#8B3A2B]">{book.category_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.publication_year}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.format}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.language}</span>
                  </div>

                  {/* Title & Subtitle */}
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                    {book.title}
                  </h1>
                  {book.subtitle && (
                    <p className="font-serif text-sm sm:text-base text-stone-600 italic mt-1">
                      {book.subtitle}
                    </p>
                  )}

                  {/* Authors */}
                  <div className="mt-2 text-sm text-stone-700">
                    <span className="font-medium">By </span>
                    {book.authors.map((a, i) => (
                      <span key={a.id}>
                        <button
                          onClick={() => {
                            if (onSelectAuthor) onSelectAuthor(a.id);
                            onClose();
                          }}
                          className="font-medium text-stone-900 hover:text-[#8B3A2B] underline decoration-stone-300 hover:decoration-[#8B3A2B] transition-colors"
                        >
                          {a.name}
                        </button>
                        {i < book.authors.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Rating & Popularity */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-stone-700">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      <span className="font-semibold text-sm">{book.rating.toFixed(1)}</span>
                      <span className="text-stone-600 font-mono">({book.rating_count} reviews)</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-4 text-xs sm:text-sm text-stone-700 leading-relaxed max-w-prose">
                    <p>{book.description}</p>
                  </div>
                </div>

                {/* Availability Callout Card */}
                <div className="mt-6 p-4 rounded-xl border border-stone-200 bg-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {availableCopies > 0 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span className="text-xs sm:text-sm font-semibold text-emerald-900">
                            Available for Checkout
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-700" />
                          <span className="text-xs sm:text-sm font-semibold text-amber-900">
                            Currently Checked Out
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      <span className="font-semibold text-stone-900">{availableCopies}</span> of{' '}
                      <span className="font-semibold text-stone-900">{totalCopies}</span> physical copies
                      currently on shelf
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* If user currently has active loan */}
                    {book.userActiveLoan ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReturn(book.userActiveLoan!.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 transition-colors shadow-xs"
                        >
                          Return Copy ({book.userActiveLoan.accession_number})
                        </button>
                        <button
                          onClick={() => handleRenew(book.userActiveLoan!.id)}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                        >
                          Renew
                        </button>
                      </div>
                    ) : availableCopies > 0 ? (
                      <button
                        onClick={handleBorrow}
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] transition-colors shadow-xs"
                      >
                        {actionLoading ? 'Processing...' : 'Borrow Book'}
                      </button>
                    ) : book.userReservation ? (
                      <button
                        onClick={() => handleCancelReservation(book.userReservation!.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors"
                      >
                        Cancel Reservation Hold
                      </button>
                    ) : (
                      <button
                        onClick={handleReserve}
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors shadow-xs"
                      >
                        {actionLoading ? 'Placing Hold...' : 'Reserve Next Copy'}
                      </button>
                    )}

                    {/* Digital Reading Room Action */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenReader) onOpenReader(book.id);
                        onClose();
                      }}
                      className="px-4 py-2.5 rounded-lg text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200/90 border border-amber-300/80 transition-colors shadow-xs flex items-center gap-1.5"
                      title="Open full book text in the digital reading room"
                    >
                      <BookOpen className="w-4 h-4 text-[#8B3A2B]" />
                      <span>Read Online</span>
                    </button>

                    {/* Secondary Actions: Favorite & Share */}
                    <button
                      onClick={handleToggleFavorite}
                      className={`p-2.5 rounded-lg border transition-colors focus:outline-none ${
                        book.is_favorite
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : 'border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                      title={book.is_favorite ? 'Favorited' : 'Add to Favorites'}
                      aria-label="Toggle favorite"
                    >
                      <Heart
                        className={`w-4 h-4 ${book.is_favorite ? 'fill-red-600 text-red-600' : ''}`}
                      />
                    </button>

                    <button
                      onClick={handleShare}
                      className="p-2.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors focus:outline-none"
                      title="Share book"
                      aria-label="Share book"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Detailed Technical Metadata Grid */}
            <div className="border-t border-stone-200 pt-6">
              <h3 className="font-serif text-lg font-semibold text-stone-900 mb-4">
                Bibliographic Information
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600 block uppercase tracking-wider text-[10px] font-semibold">
                    ISBN-13
                  </span>
                  <span className="font-mono text-stone-900 font-medium block mt-1">
                    {book.isbn13}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600 block uppercase tracking-wider text-[10px] font-semibold">
                    Publisher
                  </span>
                  <span className="text-stone-900 font-medium block mt-1 truncate">
                    {book.publisher || 'Athenaeum Press'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600 block uppercase tracking-wider text-[10px] font-semibold">
                    Edition & Format
                  </span>
                  <span className="text-stone-900 font-medium block mt-1">
                    {book.edition || 'Standard'} ({book.format})
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600 block uppercase tracking-wider text-[10px] font-semibold">
                    Pages & Language
                  </span>
                  <span className="text-stone-900 font-medium block mt-1">
                    {book.page_count} pages · {book.language}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Section: Individual Physical Copies Breakdown */}
            <div className="border-t border-stone-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">
                    Physical Copies Inventory
                  </h3>
                  <p className="text-xs text-stone-600">
                    Track individual accession barcodes, shelf placements, and copy conditions.
                  </p>
                </div>
                <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">
                  {totalCopies} registered {totalCopies === 1 ? 'copy' : 'copies'}
                </span>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3">Accession ID</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Checkout Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {book.copies && book.copies.length > 0 ? (
                      book.copies.map((copy) => {
                        const isAvailable = copy.status === 'AVAILABLE';
                        return (
                          <tr
                            key={copy.id}
                            className={`hover:bg-stone-50/80 transition-colors ${
                              selectedCopyId === copy.id && isAvailable ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-medium text-stone-900">
                              {copy.accession_number}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600">
                              Shelf {copy.shelf_number || book.shelf_number} (Floor {copy.floor || book.floor})
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-stone-700">{copy.condition}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 font-medium ${
                                  copy.status === 'AVAILABLE'
                                    ? 'text-emerald-700'
                                    : copy.status === 'ISSUED'
                                    ? 'text-amber-800'
                                    : copy.status === 'RESERVED'
                                    ? 'text-purple-700'
                                    : 'text-stone-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    copy.status === 'AVAILABLE'
                                      ? 'bg-emerald-600'
                                      : copy.status === 'ISSUED'
                                      ? 'bg-amber-600'
                                      : copy.status === 'RESERVED'
                                      ? 'bg-purple-600'
                                      : 'bg-stone-400'
                                  }`}
                                />
                                {copy.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-500">
                              {copy.status === 'ISSUED' && copy.current_due_date ? (
                                <span>
                                  Due back on {copy.current_due_date}
                                  {isLibrarianOrAdmin && copy.current_borrower_name
                                    ? ` (${copy.current_borrower_name})`
                                    : ''}
                                </span>
                              ) : copy.status === 'RESERVED' ? (
                                <span className="text-purple-800">Held for patron</span>
                              ) : isAvailable ? (
                                <span className="text-emerald-700 font-medium">On Shelf</span>
                              ) : (
                                <span>Under preservation review</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-stone-500">
                          No physical copies records found in inventory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
