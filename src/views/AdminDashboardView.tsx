import React, { useState, useEffect } from 'react';
import {
  Shield,
  BookOpen,
  Users,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  RotateCcw,
  Sparkles,
  BarChart3,
  Search,
  Check,
  Database,
} from 'lucide-react';
import { Book, User, LibraryStats } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AddBookModal } from '../components/AddBookModal.tsx';
import { BatchImportModal } from '../components/BatchImportModal.tsx';

interface AdminDashboardViewProps {
  onSelectBook: (book: Book) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onSelectBook }) => {
  const { currentUser, showToast } = useAuth();
  const [adminTab, setAdminTab] = useState<'circulation' | 'catalog' | 'users' | 'analytics'>('circulation');

  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [addBookOpen, setAddBookOpen] = useState<boolean>(false);
  const [batchImportOpen, setBatchImportOpen] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [addCopiesModal, setAddCopiesModal] = useState<{ open: boolean; book: Book | null }>({
    open: false,
    book: null,
  });
  const [extraCopiesCount, setExtraCopiesCount] = useState<string>('2');

  // Circulation Quick Form
  const [returnBarcode, setReturnBarcode] = useState<string>('');
  const [issueBookId, setIssueBookId] = useState<string>('');
  const [issueUserId, setIssueUserId] = useState<string>('');
  const [circulationLoading, setCirculationLoading] = useState<boolean>(false);

  // Search filter inside admin catalog table
  const [adminSearch, setAdminSearch] = useState<string>('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSyncDatabase = async () => {
    setSyncing(true);
    try {
      const res = await api.syncDatabase();
      showToast(res.message, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Database synchronization failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, overviewData, booksData, usersData] = await Promise.all([
        api.getStats(),
        api.getAdminOverview(),
        api.getBooks({ limit: 50 }),
        api.getUsers(),
      ]);
      setStats(statsData);
      setOverview(overviewData);
      setBooks(booksData.books || []);
      setUsers(usersData);
    } catch (e) {
      console.error(e);
      showToast('Failed to load admin dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBarcode.trim()) return;

    setCirculationLoading(true);
    try {
      // Find copy by barcode
      const copy = books
        .flatMap((b) => b.copies || [])
        .find((c) => c.accession_number.toLowerCase() === returnBarcode.trim().toLowerCase());

      const res = await api.returnBook({
        copyId: copy?.id,
      });

      showToast(res.message, 'success');
      setReturnBarcode('');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Check-in failed. Verify accession barcode.', 'error');
    } finally {
      setCirculationLoading(false);
    }
  };

  const handleQuickIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueBookId || !issueUserId) {
      showToast('Select both a book and a patron to issue loan', 'error');
      return;
    }

    setCirculationLoading(true);
    try {
      const res = await api.borrowBook(issueBookId, issueUserId);
      showToast(res.message, 'success');
      setIssueBookId('');
      setIssueUserId('');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue loan', 'error');
    } finally {
      setCirculationLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" and all its physical copies from the library database?`)) {
      return;
    }
    try {
      const res = await api.deleteBook(bookId);
      showToast(res.message, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Could not delete book', 'error');
    }
  };

  const handleAddCopiesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCopiesModal.book) return;
    const count = parseInt(extraCopiesCount, 10);
    try {
      const res = await api.addCopies(addCopiesModal.book.id, { count });
      showToast(res.message, 'success');
      setAddCopiesModal({ open: false, book: null });
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add copies', 'error');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      showToast('User role updated', 'success');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
    } catch {
      showToast('Failed to change user role', 'error');
    }
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
      b.isbn13.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (b.authors && b.authors.some((a) => a.name.toLowerCase().includes(adminSearch.toLowerCase())))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B3A2B] uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Librarian Command Console</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Circulation & Catalog Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Real-time control over database volumes, accession numbers, loan check-outs, and patron memberships.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSyncDatabase}
            disabled={syncing}
            className="px-3.5 py-2.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 border border-stone-300/80 transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-50"
            title="Verify and synchronize accession records with SQLite"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#8B3A2B]' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync & Update Database'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchImportOpen(true)}
            className="px-3.5 py-2.5 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition-colors shadow-2xs flex items-center gap-2"
          >
            <Database className="w-3.5 h-3.5 text-[#8B3A2B]" />
            <span>Batch Ingest / Update</span>
          </button>

          <button
            type="button"
            onClick={() => setAddBookOpen(true)}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] transition-colors shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Acquisition</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Total Titles</span>
          <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
            {stats?.totalBooks ?? '—'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Physical Copies</span>
          <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
            {stats?.totalCopies ?? '—'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-emerald-800 block">On Shelf</span>
          <span className="font-serif text-2xl font-bold text-emerald-700 tabular-nums">
            {stats?.availableCopies ?? '—'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-amber-800 block">Issued Copies</span>
          <span className="font-serif text-2xl font-bold text-amber-800 tabular-nums">
            {stats?.issuedCopies ?? '—'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-red-800 block">Overdue Loans</span>
          <span className="font-serif text-2xl font-bold text-red-700 tabular-nums">
            {stats?.overdueCount ?? '—'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Patrons</span>
          <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
            {stats?.usersCount ?? '—'}
          </span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/80 max-w-xl">
        <button
          onClick={() => setAdminTab('circulation')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
            adminTab === 'circulation' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Circulation Desk
        </button>
        <button
          onClick={() => setAdminTab('catalog')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
            adminTab === 'catalog' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Catalog Inventory
        </button>
        <button
          onClick={() => setAdminTab('users')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
            adminTab === 'users' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Patron Directory
        </button>
        <button
          onClick={() => setAdminTab('analytics')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
            adminTab === 'analytics' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Analytics & Health
        </button>
      </div>

      {/* Tab 1: CIRCULATION DESK (Issue book, return book, overdue items) */}
      {adminTab === 'circulation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Check-in / Return */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-serif text-base font-bold text-stone-900 mb-1">
                Quick Book Check-In / Return
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Scan or enter the physical accession barcode (e.g., ACC-SICP-01, ACC-SAPIENS-01).
              </p>

              <form onSubmit={handleQuickReturn} className="flex gap-2">
                <input
                  type="text"
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  placeholder="ACC-XXXX-XX"
                  className="flex-1 p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-amber-900/40"
                />
                <button
                  type="submit"
                  disabled={circulationLoading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                >
                  Process Return
                </button>
              </form>
            </div>

            {/* Quick Loan Issue */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-serif text-base font-bold text-stone-900 mb-1">
                Issue Loan to Patron
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Select title and patron account to check out an available copy.
              </p>

              <form onSubmit={handleQuickIssue} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={issueBookId}
                    onChange={(e) => setIssueBookId(e.target.value)}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900"
                  >
                    <option value="">Select Book...</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.available_copies === 0}>
                        {b.title} ({b.available_copies} avail)
                      </option>
                    ))}
                  </select>

                  <select
                    value={issueUserId}
                    onChange={(e) => setIssueUserId(e.target.value)}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900"
                  >
                    <option value="">Select Patron...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.membership_id})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={circulationLoading}
                  className="w-full py-2 bg-[#8B3A2B] hover:bg-[#732F23] text-white font-semibold rounded-lg transition-colors"
                >
                  Issue 14-Day Loan
                </button>
              </form>
            </div>
          </div>

          {/* Overdue Loans Table */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Overdue Borrowing Records
                </h3>
                <p className="text-xs text-stone-500">
                  Items past their scheduled return date requiring patron notice.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                {overview?.overdueLoans?.length || 0} overdue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Patron</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Days Past Due</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {overview?.overdueLoans && overview.overdueLoans.length > 0 ? (
                    overview.overdueLoans.map((item: any) => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-medium text-stone-900">{item.book_title}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{item.accession_number}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-stone-800">{item.user_name}</span>
                          <span className="text-[10px] text-stone-400 block">{item.user_email}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{item.due_date}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-red-700 font-semibold">{item.days_overdue} days</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleQuickReturn({ preventDefault: () => {} } as any)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded"
                          >
                            Check In
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-500">
                        All checked out copies are currently in good standing within their due dates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: CATALOG INVENTORY */}
      {adminTab === 'catalog' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Filter catalog records..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setAddBookOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Book</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Title & Author</th>
                  <th className="py-2.5 px-3">Discipline</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">ISBN-13</th>
                  <th className="py-2.5 px-3">Copies (Avail/Total)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onSelectBook(b)}
                        className="font-medium text-stone-900 hover:text-[#8B3A2B] text-left block"
                      >
                        {b.title}
                      </button>
                      <span className="text-[11px] text-stone-500">
                        {b.authors && b.authors[0] ? b.authors[0].name : 'Unknown'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">{b.category_name}</td>
                    <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">
                      Shelf {b.shelf_number || 'A-01'} (Fl {b.floor || 1})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-500 text-[11px]">{b.isbn13}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-emerald-700 font-semibold">{b.available_copies}</span> /{' '}
                      <span className="text-stone-800">{b.total_copies}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => setAddCopiesModal({ open: true, book: b })}
                        className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium"
                        title="Add more physical copies"
                      >
                        + Copies
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b.id, b.title)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete from catalog"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: PATRON DIRECTORY */}
      {adminTab === 'users' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                Registered Patrons & Access Rights
              </h3>
              <p className="text-xs text-stone-500">
                Manage roles and view active checkout tallies across university accounts.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
              {users.length} members
            </span>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Member ID</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Active Loans</th>
                  <th className="py-2.5 px-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{u.name}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-600">{u.membership_id}</td>
                    <td className="py-2.5 px-3 text-stone-500">{u.email}</td>
                    <td className="py-2.5 px-3 font-mono font-medium">
                      {u.active_loans_count ?? 0} active
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="p-1 rounded border border-stone-200 text-stone-800 bg-white font-medium text-[11px]"
                      >
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Librarian">Librarian</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: ANALYTICS & HEALTH */}
      {adminTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 mb-3">
              Collection Volume by Discipline
            </h3>
            <div className="space-y-3 text-xs">
              {overview?.categoryDistribution?.map((cat: any) => (
                <div key={cat.name}>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-stone-800">{cat.name}</span>
                    <span className="text-stone-500 font-mono">
                      {cat.book_count} titles · {cat.copy_count} copies
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (cat.book_count / 10) * 100)}%`,
                        backgroundColor: cat.accent_color || '#8B3A2B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Copy Inventory Health */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Copy Condition Health Report
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {overview?.copyConditions?.map((cond: any) => (
                <div key={cond.condition} className="p-3 rounded-xl bg-[#FAF7F2] border border-stone-200/80">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px] block font-semibold">
                    Condition: {cond.condition}
                  </span>
                  <span className="font-serif text-2xl font-bold text-stone-900 mt-1 block tabular-nums">
                    {cond.count} copies
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        onBookCreated={loadAdminData}
      />

      {/* Add Extra Copies Modal */}
      {addCopiesModal.open && addCopiesModal.book && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setAddCopiesModal({ open: false, book: null })}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Generate Extra Physical Copies
            </h3>
            <p className="text-xs text-stone-600">
              Mint additional accession barcodes for "{addCopiesModal.book.title}".
            </p>

            <form onSubmit={handleAddCopiesSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Number of Copies to Add (1–10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={extraCopiesCount}
                  onChange={(e) => setExtraCopiesCount(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddCopiesModal({ open: false, book: null })}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B3A2B] hover:bg-[#732F23] text-white font-semibold rounded-lg text-xs"
                >
                  Mint Copies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import & Catalog Update Modal */}
      <BatchImportModal
        isOpen={batchImportOpen}
        onClose={() => setBatchImportOpen(false)}
        onSuccess={loadAdminData}
      />
    </div>
  );
};
