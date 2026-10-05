import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Heart,
  BookmarkCheck,
  History,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { BorrowingRecord, Reservation, FavoriteItem, Book } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { BookCover } from '../components/BookCover.tsx';

interface MyLibraryViewProps {
  onSelectBookById: (bookId: string) => void;
  onExploreCatalog: () => void;
  onOpenReader?: (bookId: string) => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  onSelectBookById,
  onExploreCatalog,
  onOpenReader,
}) => {
  const { currentUser, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'loans' | 'reservations' | 'favorites' | 'history'>('loans');

  const [activeLoans, setActiveLoans] = useState<BorrowingRecord[]>([]);
  const [history, setHistory] = useState<BorrowingRecord[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadMyLibrary();
  }, [currentUser?.id]);

  const loadMyLibrary = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await api.getMyLibrary(currentUser.id);
      setActiveLoans(data.activeLoans || []);
      setHistory(data.history || []);
      setReservations(data.reservations || []);
      setFavorites(data.favorites || []);
    } catch (e) {
      console.error(e);
      showToast('Could not load library loans from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (borrowingId: string) => {
    setActionInProgress(borrowingId);
    try {
      const res = await api.returnBook({ borrowingId });
      showToast(res.message, 'success');
      await loadMyLibrary();
    } catch (err: any) {
      showToast(err.message || 'Failed to return book', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRenew = async (borrowingId: string) => {
    setActionInProgress(borrowingId);
    try {
      const res = await api.renewLoan(borrowingId);
      showToast(res.message, 'success');
      await loadMyLibrary();
    } catch (err: any) {
      showToast(err.message || 'Failed to renew loan', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    setActionInProgress(resId);
    try {
      const res = await api.cancelReservation(resId);
      showToast(res.message, 'info');
      await loadMyLibrary();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel reservation', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveFavorite = async (bookId: string) => {
    if (!currentUser) return;
    try {
      await api.removeFavorite(bookId, currentUser.id);
      showToast('Removed from favorites', 'info');
      setFavorites((prev) => prev.filter((f) => f.id !== bookId));
    } catch {
      showToast('Failed to remove favorite', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Patron Card Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#8B3A2B] text-amber-100 flex items-center justify-center font-serif text-2xl font-bold shadow-xs">
            {currentUser?.name.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                {currentUser?.name}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {currentUser?.role}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Member ID: <span className="font-mono text-stone-800 font-medium">{currentUser?.membership_id}</span> ·{' '}
              {currentUser?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-stone-200 pt-4 sm:pt-0 sm:pl-8">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
              Active Loans
            </span>
            <span className="font-serif text-2xl font-bold text-stone-900 block tabular-nums">
              {activeLoans.length}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
              Reservations
            </span>
            <span className="font-serif text-2xl font-bold text-stone-900 block tabular-nums">
              {reservations.length}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
              Saved
            </span>
            <span className="font-serif text-2xl font-bold text-stone-900 block tabular-nums">
              {favorites.length}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/80 max-w-xl">
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'loans'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Active Loans ({activeLoans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'reservations'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Holds ({reservations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'favorites'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Saved ({favorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({history.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-12 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'loans' ? (
        /* ACTIVE LOANS */
        activeLoans.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No active borrowed books
            </h3>
            <p className="text-xs text-stone-500">
              You currently have no books checked out from the library stacks.
            </p>
            <button
              onClick={onExploreCatalog}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] transition-colors shadow-xs"
            >
              Explore Catalog & Borrow
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLoans.map((loan) => (
              <div
                key={loan.loan_id}
                className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-amber-900/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    onClick={() => onSelectBookById(loan.book_id)}
                    className="cursor-pointer shrink-0"
                  >
                    <BookCover
                      title={loan.title}
                      authorName={loan.author_name}
                      size="sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                      <span>{loan.category_name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Barcode: {loan.accession_number}</span>
                    </div>

                    <h3
                      onClick={() => onSelectBookById(loan.book_id)}
                      className="font-serif text-lg font-bold text-stone-900 hover:text-[#8B3A2B] cursor-pointer transition-colors"
                    >
                      {loan.title}
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">{loan.author_name}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Borrowed: {loan.issued_at}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>Due date: <strong className="text-stone-900">{loan.due_date}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days remaining badge & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                  <div>
                    {loan.is_overdue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Overdue ({Math.abs(loan.days_remaining)} days)
                      </span>
                    ) : loan.days_remaining <= 3 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Due in {loan.days_remaining} {loan.days_remaining === 1 ? 'day' : 'days'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {loan.days_remaining} days remaining
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenReader && (
                      <button
                        onClick={() => onOpenReader(loan.book_id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200/90 border border-amber-300/80 transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Read online in digital reader"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#8B3A2B]" />
                        <span>Read Book</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleReturn(loan.loan_id)}
                      disabled={actionInProgress === loan.loan_id}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-xs"
                    >
                      Return Book
                    </button>
                    <button
                      onClick={() => handleRenew(loan.loan_id)}
                      disabled={actionInProgress === loan.loan_id || loan.renewed_count >= 2}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                      title={loan.renewed_count >= 2 ? 'Maximum renewals reached' : 'Renew for 14 days'}
                    >
                      Renew ({loan.renewed_count}/2)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'reservations' ? (
        /* RESERVATIONS */
        reservations.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <Clock className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No active reservations
            </h3>
            <p className="text-xs text-stone-500">
              When all copies of a book are checked out, place a hold to reserve the next available copy.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((res) => (
              <div
                key={res.reservation_id}
                className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                    <span>{res.category_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Hold placed: {res.reserved_at}</span>
                  </div>
                  <h3
                    onClick={() => onSelectBookById(res.book_id)}
                    className="font-serif text-lg font-bold text-stone-900 hover:text-[#8B3A2B] cursor-pointer"
                  >
                    {res.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">{res.author_name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                    Hold Active
                  </span>
                  <button
                    onClick={() => handleCancelReservation(res.reservation_id)}
                    disabled={actionInProgress === res.reservation_id}
                    className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-50 transition-colors"
                    title="Cancel reservation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'favorites' ? (
        /* FAVORITES */
        favorites.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <Heart className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No saved favorites
            </h3>
            <p className="text-xs text-stone-500">
              Click the bookmark heart on any book to save it for your reading list.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((fav) => (
              <div
                key={fav.favorite_id}
                className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-medium text-stone-500">{fav.category_name}</span>
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors"
                      title="Remove favorite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3
                    onClick={() => onSelectBookById(fav.id)}
                    className="font-serif text-base font-bold text-stone-900 hover:text-[#8B3A2B] cursor-pointer"
                  >
                    {fav.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">{fav.author_name}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500">
                    {fav.available_copies > 0 ? (
                      <span className="text-emerald-700 font-medium">● Available on shelf</span>
                    ) : (
                      <span className="text-amber-700">● Currently issued</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {onOpenReader && (
                      <button
                        onClick={() => onOpenReader(fav.id)}
                        className="px-2 py-1 rounded text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1"
                        title="Read online in digital reader"
                      >
                        <BookOpen className="w-3 h-3 text-[#8B3A2B]" />
                        <span>Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => onSelectBookById(fav.id)}
                      className="text-xs font-semibold text-[#8B3A2B] hover:underline"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* READING HISTORY */
        history.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            No previous borrowing history recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.loan_id}
                className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <h4
                    onClick={() => onSelectBookById(record.book_id)}
                    className="font-serif font-bold text-stone-900 hover:text-[#8B3A2B] cursor-pointer text-sm"
                  >
                    {record.title}
                  </h4>
                  <p className="text-stone-500 mt-0.5">
                    {record.author_name} · Barcode: {record.accession_number}
                  </p>
                </div>
                <div className="text-right text-stone-500">
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Returned {record.returned_at}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
