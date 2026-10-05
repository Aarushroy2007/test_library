export interface Author {
  id: string;
  name: string;
  biography?: string;
  photo_url?: string;
  birth_year?: number;
  nationality?: string;
  book_count?: number;
  books?: Partial<Book>[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  accent_color?: string;
  book_count?: number;
}

export type CopyStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'MAINTENANCE';
export type CopyCondition = 'Pristine' | 'New' | 'Good' | 'Fair' | 'Worn';

export interface BookCopy {
  id: string;
  book_id?: string;
  accession_number: string;
  shelf_number?: string;
  section?: string;
  floor?: number;
  status: CopyStatus;
  condition: CopyCondition;
  updated_at?: string;
  current_loan_id?: string;
  current_borrower_id?: string;
  current_borrower_name?: string;
  current_due_date?: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  isbn10?: string;
  isbn13: string;
  publisher?: string;
  publication_year: number;
  publication_date?: string;
  edition?: string;
  language: string;
  page_count: number;
  format: string; // Hardcover, Paperback, E-book, Audiobook
  cover_image_url?: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  shelf_number?: string;
  section?: string;
  floor?: number;
  rating: number;
  rating_count: number;
  featured?: number;
  popular_score?: number;
  total_copies: number;
  available_copies: number;
  issued_copies: number;
  reserved_copies: number;
  is_favorite?: boolean;
  author_name?: string;
  authors: Author[];
  copies?: BookCopy[];
  userReservation?: {
    id: string;
    reserved_at: string;
    expiry_date: string;
    status: string;
  } | null;
  userActiveLoan?: {
    id: string;
    issued_at: string;
    due_date: string;
    renewed_count: number;
    accession_number: string;
  } | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty' | 'Librarian' | 'Admin';
  membership_id: string;
  profile_image?: string;
  active_loans_count?: number;
  total_borrowed_count?: number;
  created_at?: string;
}

export interface BorrowingRecord {
  loan_id: string;
  book_id: string;
  title: string;
  subtitle?: string;
  format: string;
  copy_id?: string;
  accession_number: string;
  shelf_number?: string;
  section?: string;
  floor?: number;
  author_name: string;
  category_name: string;
  category_color?: string;
  issued_at: string;
  due_date: string;
  returned_at?: string | null;
  renewed_count: number;
  is_overdue: number | boolean;
  days_remaining: number;
  notes?: string;
}

export interface Reservation {
  reservation_id: string;
  book_id: string;
  title: string;
  subtitle?: string;
  category_name: string;
  category_color?: string;
  author_name: string;
  reserved_at: string;
  expiry_date: string;
  status: string;
  available_copies: number;
}

export interface FavoriteItem {
  favorite_id: string;
  id: string;
  title: string;
  subtitle?: string;
  rating: number;
  format: string;
  shelf_number?: string;
  category_name: string;
  category_color?: string;
  author_name: string;
  available_copies: number;
  total_copies: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'borrow' | 'return' | 'reserve' | 'due_soon' | 'overdue' | 'info';
  is_read: number;
  created_at: string;
}

export interface LibraryStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  reservedCopies: number;
  maintenanceCopies: number;
  authorsCount: number;
  categoriesCount: number;
  activeBorrowers: number;
  overdueCount: number;
  activeReservations: number;
  usersCount: number;
}

export interface BookFilterParams {
  search?: string;
  category?: string;
  author?: string;
  availability?: string;
  language?: string;
  format?: string;
  yearRange?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface BookChapter {
  id: string;
  book_id: string;
  chapter_index: number;
  title: string;
  subtitle?: string;
  content: string;
  word_count: number;
  reading_minutes: number;
}

export interface BookmarkItem {
  id: string;
  chapter_index: number;
  chapter_title: string;
  excerpt: string;
  created_at: string;
}

export interface HighlightItem {
  id: string;
  chapter_index: number;
  text: string;
  color: 'amber' | 'emerald' | 'rose' | 'sky';
  note?: string;
  created_at: string;
}

export interface ReadingProgress {
  id?: string;
  user_id: string;
  book_id: string;
  current_chapter_index: number;
  progress_percent: number;
  scroll_position: number;
  total_reading_time_seconds: number;
  bookmarks: BookmarkItem[];
  highlights: HighlightItem[];
  last_read_at?: string;
  book?: Partial<Book>;
}

export interface ReaderData {
  book: Book;
  chapters: BookChapter[];
  progress?: ReadingProgress;
}

