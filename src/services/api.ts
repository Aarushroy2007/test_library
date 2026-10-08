import {
  Book,
  Category,
  Author,
  LibraryStats,
  BorrowingRecord,
  Reservation,
  FavoriteItem,
  NotificationItem,
  User,
  BookFilterParams,
  ReaderData,
  ReadingProgress,
  BookmarkItem,
  HighlightItem,
} from '../types.ts';

const API_BASE = '/api';

async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Statistics
  getStats: async (): Promise<LibraryStats> => {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse<LibraryStats>(res);
  },

  // Books
  getBooks: async (
    params: BookFilterParams = {},
    userId?: string
  ): Promise<{ books: Book[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.collection && params.collection !== 'all') query.set('collection', params.collection);
    if (params.author && params.author !== 'all') query.set('author', params.author);
    if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
    if (params.language && params.language !== 'all') query.set('language', params.language);
    if (params.format && params.format !== 'all') query.set('format', params.format);
    if (params.yearRange && params.yearRange !== 'all') query.set('yearRange', params.yearRange);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (userId) query.set('userId', userId);

    const res = await fetch(`${API_BASE}/books?${query.toString()}`);
    return handleResponse(res);
  },

  getFeaturedBooks: async (userId?: string): Promise<Book[]> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/books/featured${query}`);
    return handleResponse<Book[]>(res);
  },

  getBookById: async (id: string, userId?: string): Promise<Book> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/books/${encodeURIComponent(id)}${query}`);
    return handleResponse<Book>(res);
  },

  createBook: async (data: any): Promise<{ message: string; bookId: string }> => {
    const res = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateBook: async (id: string, data: any): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/books/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteBook: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  addCopies: async (bookId: string, data: { count: number; shelf_number?: string; section?: string; floor?: number; condition?: string }) => {
    const res = await fetch(`${API_BASE}/books/${encodeURIComponent(bookId)}/copies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateCopyStatus: async (copyId: string, status: string, condition?: string) => {
    const res = await fetch(`${API_BASE}/copies/${encodeURIComponent(copyId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, condition }),
    });
    return handleResponse(res);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse<Category[]>(res);
  },

  createCategory: async (data: any) => {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Authors
  getAuthors: async (search?: string): Promise<Author[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/authors${query}`);
    return handleResponse<Author[]>(res);
  },

  getAuthorById: async (id: string): Promise<Author> => {
    const res = await fetch(`${API_BASE}/authors/${encodeURIComponent(id)}`);
    return handleResponse<Author>(res);
  },

  createAuthor: async (data: any) => {
    const res = await fetch(`${API_BASE}/authors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Borrowing
  borrowBook: async (bookId: string, userId: string, copyId?: string) => {
    const res = await fetch(`${API_BASE}/borrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, userId, copyId }),
    });
    return handleResponse(res);
  },

  returnBook: async (params: { borrowingId?: string; copyId?: string }) => {
    const res = await fetch(`${API_BASE}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  renewLoan: async (borrowingId: string) => {
    const res = await fetch(`${API_BASE}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ borrowingId }),
    });
    return handleResponse(res);
  },

  // Reservations
  reserveBook: async (bookId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, userId }),
    });
    return handleResponse(res);
  },

  cancelReservation: async (reservationId: string) => {
    const res = await fetch(`${API_BASE}/reservations/${encodeURIComponent(reservationId)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // My Library
  getMyLibrary: async (userId: string): Promise<{
    activeLoans: BorrowingRecord[];
    history: BorrowingRecord[];
    reservations: Reservation[];
    favorites: FavoriteItem[];
  }> => {
    const res = await fetch(`${API_BASE}/my-library?userId=${encodeURIComponent(userId)}`);
    return handleResponse(res);
  },

  // Favorites
  toggleFavorite: async (userId: string, bookId: string): Promise<{ favorited: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bookId }),
    });
    return handleResponse(res);
  },

  removeFavorite: async (bookId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/favorites/${encodeURIComponent(bookId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Notifications
  getNotifications: async (userId: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
    const res = await fetch(`${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`);
    return handleResponse(res);
  },

  markNotificationRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async (userId: string) => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },

  // Users & Admin
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`);
    return handleResponse<User[]>(res);
  },

  updateUserRole: async (userId: string, role: string) => {
    const res = await fetch(`${API_BASE}/users/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    return handleResponse(res);
  },

  login: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ user: User; message: string }>(res);
  },

  register: async (name: string, email: string, role: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    return handleResponse<{ user: User; message: string }>(res);
  },

  getAdminOverview: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/overview`);
    return handleResponse(res);
  },

  syncDatabase: async () => {
    const res = await fetch(`${API_BASE}/admin/sync-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<{ success: boolean; message: string; stats: any }>(res);
  },

  batchImportBooks: async (items: any[]) => {
    const res = await fetch(`${API_BASE}/admin/batch-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse<{ success: boolean; message: string; insertedBooks: number; insertedCopies: number }>(res);
  },

  // Digital Reader & Reading Progress
  getReaderData: async (bookId: string, userId?: string): Promise<ReaderData> => {
    const url = userId
      ? `${API_BASE}/books/${encodeURIComponent(bookId)}/reader?userId=${encodeURIComponent(userId)}`
      : `${API_BASE}/books/${encodeURIComponent(bookId)}/reader`;
    const res = await fetch(url);
    return handleResponse<ReaderData>(res);
  },

  saveReadingProgress: async (data: {
    userId: string;
    bookId: string;
    currentChapterIndex: number;
    progressPercent: number;
    scrollPosition?: number;
    timeSpentSeconds?: number;
  }) => {
    const res = await fetch(`${API_BASE}/reading/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  addBookmark: async (data: {
    userId: string;
    bookId: string;
    chapterIndex: number;
    chapterTitle: string;
    excerpt?: string;
  }) => {
    const res = await fetch(`${API_BASE}/reading/bookmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; bookmark: BookmarkItem }>(res);
  },

  deleteBookmark: async (userId: string, bookId: string, bookmarkId: string) => {
    const res = await fetch(`${API_BASE}/reading/bookmark`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bookId, bookmarkId }),
    });
    return handleResponse(res);
  },

  addHighlight: async (data: {
    userId: string;
    bookId: string;
    chapterIndex: number;
    text: string;
    color?: string;
    note?: string;
  }) => {
    const res = await fetch(`${API_BASE}/reading/highlight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; highlight: HighlightItem }>(res);
  },

  deleteHighlight: async (userId: string, bookId: string, highlightId: string) => {
    const res = await fetch(`${API_BASE}/reading/highlight`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bookId, highlightId }),
    });
    return handleResponse(res);
  },

  getRecentReading: async (userId: string): Promise<ReadingProgress[]> => {
    const res = await fetch(`${API_BASE}/reading/recent?userId=${encodeURIComponent(userId)}`);
    return handleResponse<ReadingProgress[]>(res);
  },
};
