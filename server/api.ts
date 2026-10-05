import express, { Request, Response } from 'express';
import { db, initDatabase, syncDatabaseCatalog } from './db.ts';
import { ensureBookChapters } from './readingContent.ts';

// Ensure database tables and initial catalog are seeded
initDatabase();

export const apiRouter = express.Router();
apiRouter.use(express.json());

export const apiApp = express();
apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));

// CORS & Preflight handling for Vercel and local clients
apiApp.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

apiApp.use('/api', apiRouter);
apiApp.use(apiRouter); // Also mounts directly at root if /api is stripped by Connect / Vercel

// -------------------------------------------------------------
// 1. QUICK / DYNAMIC LIBRARY STATISTICS
// -------------------------------------------------------------
apiRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const totalBooks = (db.prepare('SELECT COUNT(*) as c FROM books').get() as any).c;
    const totalCopies = (db.prepare('SELECT COUNT(*) as c FROM book_copies').get() as any).c;
    const availableCopies = (db.prepare("SELECT COUNT(*) as c FROM book_copies WHERE status = 'AVAILABLE'").get() as any).c;
    const issuedCopies = (db.prepare("SELECT COUNT(*) as c FROM book_copies WHERE status = 'ISSUED'").get() as any).c;
    const reservedCopies = (db.prepare("SELECT COUNT(*) as c FROM book_copies WHERE status = 'RESERVED'").get() as any).c;
    const maintenanceCopies = (db.prepare("SELECT COUNT(*) as c FROM book_copies WHERE status IN ('MAINTENANCE', 'DAMAGED', 'LOST')").get() as any).c;
    const authorsCount = (db.prepare('SELECT COUNT(*) as c FROM authors').get() as any).c;
    const categoriesCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c;
    const activeBorrowers = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM borrowing WHERE status = 'ACTIVE'").get() as any).c;
    const overdueCount = (db.prepare("SELECT COUNT(*) as c FROM borrowing WHERE status = 'ACTIVE' AND due_date < date('now')").get() as any).c;
    const activeReservations = (db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'ACTIVE'").get() as any).c;
    const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;

    res.json({
      totalBooks,
      totalCopies,
      availableCopies,
      issuedCopies,
      reservedCopies,
      maintenanceCopies,
      authorsCount,
      categoriesCount,
      activeBorrowers,
      overdueCount,
      activeReservations,
      usersCount,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to retrieve library statistics' });
  }
});

// -------------------------------------------------------------
// 2. BOOKS CATALOG WITH SEARCH, FACETED FILTERS, SORTING & PAGINATION
// -------------------------------------------------------------
apiRouter.get('/books', (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      author,
      availability,
      language,
      format,
      yearRange,
      yearMin,
      yearMax,
      sort = 'relevance',
      page = '1',
      limit = '12',
      userId,
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageLimit = Math.max(1, Math.min(50, parseInt(limit || '12', 10)));
    const offset = (pageNum - 1) * pageLimit;

    const conditions: string[] = [];
    const params: any[] = [];

    // Search query across title, description, ISBN, publisher, or author name
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      conditions.push(`(
        b.title LIKE ? OR 
        b.subtitle LIKE ? OR 
        b.description LIKE ? OR 
        b.isbn10 LIKE ? OR 
        b.isbn13 LIKE ? OR 
        b.publisher LIKE ? OR 
        EXISTS (
          SELECT 1 FROM book_authors ba 
          JOIN authors a ON ba.author_id = a.id 
          WHERE ba.book_id = b.id AND a.name LIKE ?
        ) OR
        EXISTS (
          SELECT 1 FROM book_copies bc
          WHERE bc.book_id = b.id AND bc.accession_number LIKE ?
        )
      )`);
      params.push(term, term, term, term, term, term, term, term);
    }

    // Category filter
    if (category && category !== 'all') {
      conditions.push(`(c.slug = ? OR c.id = ?)`);
      params.push(category, category);
    }

    // Author filter
    if (author && author !== 'all') {
      conditions.push(`EXISTS (SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id AND ba.author_id = ?)`);
      params.push(author);
    }

    // Availability filter
    if (availability === 'available') {
      conditions.push(`(SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') > 0`);
    } else if (availability === 'issued') {
      conditions.push(`(SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') = 0`);
    } else if (availability === 'reserved') {
      conditions.push(`EXISTS (SELECT 1 FROM reservations r WHERE r.book_id = b.id AND r.status = 'ACTIVE')`);
    }

    // Language
    if (language && language !== 'all') {
      conditions.push(`b.language = ?`);
      params.push(language);
    }

    // Format (Hardcover, Paperback, etc.)
    if (format && format !== 'all') {
      conditions.push(`b.format = ?`);
      params.push(format);
    }

    // Publication year presets or ranges
    if (yearRange === 'before-2000') {
      conditions.push(`b.publication_year < 2000`);
    } else if (yearRange === '2000-2010') {
      conditions.push(`b.publication_year >= 2000 AND b.publication_year <= 2010`);
    } else if (yearRange === '2010-2020') {
      conditions.push(`b.publication_year >= 2010 AND b.publication_year <= 2020`);
    } else if (yearRange === '2020-plus') {
      conditions.push(`b.publication_year >= 2020`);
    } else {
      if (yearMin) {
        conditions.push(`b.publication_year >= ?`);
        params.push(parseInt(yearMin, 10));
      }
      if (yearMax) {
        conditions.push(`b.publication_year <= ?`);
        params.push(parseInt(yearMax, 10));
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting order
    let orderBy = 'b.featured DESC, b.popular_score DESC';
    if (sort === 'title_asc') {
      orderBy = 'b.title ASC';
    } else if (sort === 'title_desc') {
      orderBy = 'b.title DESC';
    } else if (sort === 'author_asc') {
      orderBy = '(SELECT a.name FROM book_authors ba JOIN authors a ON ba.author_id = a.id WHERE ba.book_id = b.id LIMIT 1) ASC';
    } else if (sort === 'newest') {
      orderBy = 'b.publication_year DESC, b.publication_date DESC';
    } else if (sort === 'oldest') {
      orderBy = 'b.publication_year ASC';
    } else if (sort === 'popular') {
      orderBy = 'b.popular_score DESC, b.rating_count DESC';
    } else if (sort === 'highest_rated') {
      orderBy = 'b.rating DESC, b.rating_count DESC';
    }

    // Count total matches
    const countSql = `
      SELECT COUNT(*) as total 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
    `;
    const total = (db.prepare(countSql).get(...params) as any).total;

    // Fetch page of books
    const booksSql = `
      SELECT 
        b.id,
        b.title,
        b.subtitle,
        b.description,
        b.isbn10,
        b.isbn13,
        b.publisher,
        b.publication_year,
        b.publication_date,
        b.edition,
        b.language,
        b.page_count,
        b.format,
        b.cover_image_url,
        b.category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.accent_color as category_color,
        b.shelf_number,
        b.section,
        b.floor,
        b.rating,
        b.rating_count,
        b.featured,
        b.popular_score,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'ISSUED') as issued_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'RESERVED') as reserved_copies
        ${userId ? `, EXISTS(SELECT 1 FROM favorites f WHERE f.book_id = b.id AND f.user_id = ?) as is_favorite` : ', 0 as is_favorite'}
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams = userId ? [userId, ...params, pageLimit, offset] : [...params, pageLimit, offset];
    const rawBooks = db.prepare(booksSql).all(...queryParams) as any[];

    // Fetch authors for each book in page
    const authorStmt = db.prepare(`
      SELECT a.id, a.name, a.photo_url, ba.is_primary
      FROM book_authors ba
      JOIN authors a ON ba.author_id = a.id
      WHERE ba.book_id = ?
      ORDER BY ba.is_primary DESC, a.name ASC
    `);

    const books = rawBooks.map((b) => {
      const authors = authorStmt.all(b.id);
      return {
        ...b,
        is_favorite: Boolean(b.is_favorite),
        authors,
      };
    });

    res.json({
      books,
      pagination: {
        total,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/books:', error);
    res.status(500).json({ error: 'Failed to retrieve books from database' });
  }
});

// -------------------------------------------------------------
// 3. FEATURED & POPULAR BOOKS
// -------------------------------------------------------------
apiRouter.get('/books/featured', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const sql = `
      SELECT 
        b.id,
        b.title,
        b.subtitle,
        b.description,
        b.isbn13,
        b.publisher,
        b.publication_year,
        b.format,
        b.cover_image_url,
        b.rating,
        b.rating_count,
        b.featured,
        c.name as category_name,
        c.slug as category_slug,
        c.accent_color as category_color,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies
        ${userId ? `, EXISTS(SELECT 1 FROM favorites f WHERE f.book_id = b.id AND f.user_id = ?) as is_favorite` : ', 0 as is_favorite'}
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.featured = 1 OR b.popular_score >= 90
      ORDER BY b.popular_score DESC, b.rating DESC
      LIMIT 8
    `;

    const rawBooks = userId ? db.prepare(sql).all(userId) as any[] : db.prepare(sql).all() as any[];
    const authorStmt = db.prepare(`
      SELECT a.id, a.name 
      FROM book_authors ba 
      JOIN authors a ON ba.author_id = a.id 
      WHERE ba.book_id = ?
      ORDER BY ba.is_primary DESC
    `);

    const books = rawBooks.map((b) => ({
      ...b,
      is_favorite: Boolean(b.is_favorite),
      authors: authorStmt.all(b.id),
    }));

    res.json(books);
  } catch (error: any) {
    console.error('Error fetching featured books:', error);
    res.status(500).json({ error: 'Failed to retrieve featured books' });
  }
});

// -------------------------------------------------------------
// 4. BOOK DETAILS WITH PHYSICAL COPIES BREAKDOWN & USER STATUS
// -------------------------------------------------------------
apiRouter.get('/books/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string | undefined;

    const bookSql = `
      SELECT 
        b.*,
        c.name as category_name,
        c.slug as category_slug,
        c.description as category_description,
        c.accent_color as category_color,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'ISSUED') as issued_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'RESERVED') as reserved_copies
        ${userId ? `, EXISTS(SELECT 1 FROM favorites f WHERE f.book_id = b.id AND f.user_id = ?) as is_favorite` : ', 0 as is_favorite'}
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `;

    const book = userId ? db.prepare(bookSql).get(userId, id) as any : db.prepare(bookSql).get(id) as any;
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Authors
    const authors = db.prepare(`
      SELECT a.id, a.name, a.biography, a.photo_url, a.nationality, a.birth_year, ba.is_primary
      FROM book_authors ba
      JOIN authors a ON ba.author_id = a.id
      WHERE ba.book_id = ?
      ORDER BY ba.is_primary DESC, a.name ASC
    `).all(id);

    // Individual physical copies
    const copies = db.prepare(`
      SELECT 
        bc.id,
        bc.accession_number,
        bc.shelf_number,
        bc.section,
        bc.floor,
        bc.status,
        bc.condition,
        bc.updated_at,
        b_curr.id as current_loan_id,
        b_curr.user_id as current_borrower_id,
        b_curr.due_date as current_due_date,
        u.name as current_borrower_name
      FROM book_copies bc
      LEFT JOIN borrowing b_curr ON b_curr.book_copy_id = bc.id AND b_curr.status = 'ACTIVE'
      LEFT JOIN users u ON b_curr.user_id = u.id
      WHERE bc.book_id = ?
      ORDER BY bc.accession_number ASC
    `).all(id);

    // Active reservation by this user?
    let userReservation: any = null;
    let userActiveLoan: any = null;
    if (userId) {
      userReservation = db.prepare(`
        SELECT * FROM reservations WHERE book_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1
      `).get(id, userId);

      userActiveLoan = db.prepare(`
        SELECT br.*, bc.accession_number 
        FROM borrowing br 
        JOIN book_copies bc ON br.book_copy_id = bc.id
        WHERE bc.book_id = ? AND br.user_id = ? AND br.status = 'ACTIVE'
        LIMIT 1
      `).get(id, userId);
    }

    res.json({
      ...book,
      is_favorite: Boolean(book.is_favorite),
      authors,
      copies,
      userReservation,
      userActiveLoan,
    });
  } catch (error: any) {
    console.error('Error fetching book detail:', error);
    res.status(500).json({ error: 'Failed to retrieve book details' });
  }
});

// -------------------------------------------------------------
// 5. CREATE NEW BOOK & GENERATE PHYSICAL COPIES (LIBRARIAN / ADMIN)
// -------------------------------------------------------------
apiRouter.post('/books', (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      isbn10,
      isbn13,
      publisher,
      publication_year,
      publication_date,
      edition = '1st Edition',
      language = 'English',
      page_count,
      format = 'Hardcover',
      category_id,
      author_ids = [],
      new_author_name,
      shelf_number = 'GEN-01',
      section = 'Main Reading Hall',
      floor = 1,
      copy_count = 3,
    } = req.body;

    if (!title || !description || !isbn13) {
      return res.status(400).json({ error: 'Title, description, and ISBN-13 are required.' });
    }

    // Check duplicate ISBN
    const existing = db.prepare('SELECT id FROM books WHERE isbn13 = ?').get(isbn13);
    if (existing) {
      return res.status(400).json({ error: `A book with ISBN ${isbn13} already exists in the catalog.` });
    }

    const bookId = `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Handle new author if provided
    const targetAuthorIds: string[] = [...author_ids];
    if (new_author_name && new_author_name.trim() !== '') {
      const newAuthId = `auth_${Date.now()}`;
      db.prepare(`
        INSERT INTO authors (id, name, biography)
        VALUES (?, ?, ?)
      `).run(newAuthId, new_author_name.trim(), 'Author catalog record.');
      targetAuthorIds.push(newAuthId);
    }

    if (targetAuthorIds.length === 0) {
      return res.status(400).json({ error: 'At least one author must be specified.' });
    }

    // Insert book
    db.prepare(`
      INSERT INTO books (
        id, title, subtitle, description, isbn10, isbn13, publisher,
        publication_year, publication_date, edition, language, page_count, format,
        category_id, shelf_number, section, floor, rating, rating_count, featured, popular_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 1, 0, 50)
    `).run(
      bookId,
      title,
      subtitle || null,
      description,
      isbn10 || null,
      isbn13,
      publisher || 'Athenaeum University Press',
      publication_year ? parseInt(publication_year, 10) : new Date().getFullYear(),
      publication_date || new Date().toISOString().split('T')[0],
      edition,
      language,
      page_count ? parseInt(page_count, 10) : 320,
      format,
      category_id || 'cat_fiction',
      shelf_number,
      section,
      floor ? parseInt(floor, 10) : 1
    );

    // Insert book authors
    const insertAuthorRel = db.prepare(`
      INSERT OR IGNORE INTO book_authors (book_id, author_id, is_primary)
      VALUES (?, ?, ?)
    `);
    targetAuthorIds.forEach((aId, index) => {
      insertAuthorRel.run(bookId, aId, index === 0 ? 1 : 0);
    });

    // Generate physical copies
    const numCopies = Math.max(1, Math.min(20, parseInt(copy_count, 10) || 3));
    const insertCopy = db.prepare(`
      INSERT INTO book_copies (id, book_id, accession_number, shelf_number, section, floor, status, condition)
      VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', 'New')
    `);

    const codePart = title.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    for (let c = 1; c <= numCopies; c++) {
      const copyId = `cp_${bookId}_${c}`;
      const accessionNumber = `ACC-${codePart}-${String(c).padStart(2, '0')}`;
      insertCopy.run(copyId, bookId, accessionNumber, shelf_number, section, floor);
    }

    res.status(201).json({
      message: 'Book successfully added to catalog with physical copies.',
      bookId,
      copiesGenerated: numCopies,
    });
  } catch (error: any) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: error.message || 'Failed to add book to catalog.' });
  }
});

// -------------------------------------------------------------
// 6. UPDATE BOOK (LIBRARIAN / ADMIN)
// -------------------------------------------------------------
apiRouter.put('/books/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      isbn10,
      isbn13,
      publisher,
      publication_year,
      edition,
      language,
      page_count,
      format,
      category_id,
      shelf_number,
      section,
      floor,
      featured,
    } = req.body;

    const book = db.prepare('SELECT id FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    db.prepare(`
      UPDATE books SET
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        description = COALESCE(?, description),
        isbn10 = COALESCE(?, isbn10),
        isbn13 = COALESCE(?, isbn13),
        publisher = COALESCE(?, publisher),
        publication_year = COALESCE(?, publication_year),
        edition = COALESCE(?, edition),
        language = COALESCE(?, language),
        page_count = COALESCE(?, page_count),
        format = COALESCE(?, format),
        category_id = COALESCE(?, category_id),
        shelf_number = COALESCE(?, shelf_number),
        section = COALESCE(?, section),
        floor = COALESCE(?, floor),
        featured = COALESCE(?, featured),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      subtitle,
      description,
      isbn10,
      isbn13,
      publisher,
      publication_year,
      edition,
      language,
      page_count,
      format,
      category_id,
      shelf_number,
      section,
      floor,
      featured !== undefined ? (featured ? 1 : 0) : null,
      id
    );

    res.json({ message: 'Book updated successfully' });
  } catch (error: any) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// -------------------------------------------------------------
// 7. DELETE BOOK (LIBRARIAN / ADMIN)
// -------------------------------------------------------------
apiRouter.delete('/books/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if copies are currently checked out
    const activeLoans = db.prepare(`
      SELECT COUNT(*) as c 
      FROM borrowing br
      JOIN book_copies bc ON br.book_copy_id = bc.id
      WHERE bc.book_id = ? AND br.status = 'ACTIVE'
    `).get(id) as any;

    if (activeLoans.c > 0) {
      return res.status(400).json({
        error: `Cannot delete book: ${activeLoans.c} physical copies are currently checked out by patrons.`,
      });
    }

    db.prepare('DELETE FROM books WHERE id = ?').run(id);
    res.json({ message: 'Book and its copies were successfully removed from catalog.' });
  } catch (error: any) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// -------------------------------------------------------------
// 8. ADD COPIES TO EXISTING BOOK (LIBRARIAN / ADMIN)
// -------------------------------------------------------------
apiRouter.post('/books/:id/copies', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { count = 1, shelf_number, section, floor, condition = 'New' } = req.body;

    const book = db.prepare('SELECT title, shelf_number, section, floor FROM books WHERE id = ?').get(id) as any;
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const currentCount = (db.prepare('SELECT COUNT(*) as c FROM book_copies WHERE book_id = ?').get(id) as any).c;
    const insertCopy = db.prepare(`
      INSERT INTO book_copies (id, book_id, accession_number, shelf_number, section, floor, status, condition)
      VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?)
    `);

    const codePart = book.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    const num = Math.max(1, Math.min(20, parseInt(count, 10)));

    for (let i = 1; i <= num; i++) {
      const copyNum = currentCount + i;
      const copyId = `cp_${id}_${copyNum}_${Date.now()}`;
      const accession = `ACC-${codePart}-${String(copyNum).padStart(2, '0')}`;
      insertCopy.run(
        copyId,
        id,
        accession,
        shelf_number || book.shelf_number,
        section || book.section,
        floor ? parseInt(floor, 10) : book.floor,
        condition
      );
    }

    res.json({ message: `${num} physical copy/copies added successfully.` });
  } catch (error: any) {
    console.error('Error adding copies:', error);
    res.status(500).json({ error: 'Failed to add copies.' });
  }
});

// -------------------------------------------------------------
// 9. UPDATE COPY STATUS / CONDITION (LIBRARIAN)
// -------------------------------------------------------------
apiRouter.put('/copies/:copyId/status', (req: Request, res: Response) => {
  try {
    const { copyId } = req.params;
    const { status, condition } = req.body;

    const validStatuses = ['AVAILABLE', 'ISSUED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    db.prepare(`
      UPDATE book_copies SET
        status = COALESCE(?, status),
        condition = COALESCE(?, condition),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, condition, copyId);

    res.json({ message: 'Copy status updated successfully' });
  } catch (error: any) {
    console.error('Error updating copy status:', error);
    res.status(500).json({ error: 'Failed to update copy status' });
  }
});

// -------------------------------------------------------------
// 10. CATEGORIES
// -------------------------------------------------------------
apiRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.*,
        COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json(categories);
  } catch (error: any) {
    console.error('Error in /api/categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon = 'BookOpen', accent_color = '#8B3A2B' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = `cat_${catSlug}_${Date.now()}`;

    db.prepare(`
      INSERT INTO categories (id, name, slug, description, icon, accent_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, catSlug, description || null, icon, accent_color);

    res.status(201).json({ message: 'Category created', id });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// -------------------------------------------------------------
// 11. AUTHORS
// -------------------------------------------------------------
apiRouter.get('/authors', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    let query = `
      SELECT 
        a.*,
        COUNT(ba.book_id) as book_count
      FROM authors a
      LEFT JOIN book_authors ba ON ba.author_id = a.id
    `;
    const params: any[] = [];
    if (search && search.trim() !== '') {
      query += ` WHERE a.name LIKE ? OR a.biography LIKE ?`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    query += ` GROUP BY a.id ORDER BY a.name ASC`;

    const authors = db.prepare(query).all(...params);
    res.json(authors);
  } catch (error: any) {
    console.error('Error in /api/authors:', error);
    res.status(500).json({ error: 'Failed to retrieve authors' });
  }
});

apiRouter.get('/authors/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const books = db.prepare(`
      SELECT 
        b.id, b.title, b.subtitle, b.publication_year, b.rating, b.format,
        c.name as category_name, c.accent_color as category_color,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies
      FROM book_authors ba
      JOIN books b ON ba.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ba.author_id = ?
      ORDER BY b.publication_year DESC
    `).all(id);

    res.json({
      ...author,
      books,
    });
  } catch (error: any) {
    console.error('Error fetching author detail:', error);
    res.status(500).json({ error: 'Failed to retrieve author' });
  }
});

apiRouter.post('/authors', (req: Request, res: Response) => {
  try {
    const { name, biography, birth_year, nationality, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Author name is required' });

    const id = `auth_${Date.now()}`;
    db.prepare(`
      INSERT INTO authors (id, name, biography, birth_year, nationality, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, biography || null, birth_year ? parseInt(birth_year, 10) : null, nationality || null, photo_url || null);

    res.status(201).json({ message: 'Author created', id });
  } catch (error: any) {
    console.error('Error creating author:', error);
    res.status(500).json({ error: 'Failed to create author' });
  }
});

// -------------------------------------------------------------
// 12. CIRCULATION: BORROW A BOOK COPY
// -------------------------------------------------------------
apiRouter.post('/borrow', (req: Request, res: Response) => {
  try {
    const { bookId, userId, copyId } = req.body;

    if (!bookId || !userId) {
      return res.status(400).json({ error: 'Book ID and User ID are required.' });
    }

    // Verify user exists
    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has an active loan for this book
    const existingActive = db.prepare(`
      SELECT br.id 
      FROM borrowing br
      JOIN book_copies bc ON br.book_copy_id = bc.id
      WHERE bc.book_id = ? AND br.user_id = ? AND br.status = 'ACTIVE'
    `).get(bookId, userId);

    if (existingActive) {
      return res.status(400).json({ error: 'You already have an active loan for a copy of this book.' });
    }

    // Find available copy (specific copy if passed, otherwise any AVAILABLE copy)
    let targetCopy: any;
    if (copyId) {
      targetCopy = db.prepare("SELECT id, accession_number, status FROM book_copies WHERE id = ? AND book_id = ?").get(copyId, bookId);
      if (!targetCopy || targetCopy.status !== 'AVAILABLE') {
        return res.status(400).json({ error: 'The requested copy is currently unavailable for loan.' });
      }
    } else {
      targetCopy = db.prepare("SELECT id, accession_number FROM book_copies WHERE book_id = ? AND status = 'AVAILABLE' LIMIT 1").get(bookId);
      if (!targetCopy) {
        return res.status(400).json({ error: 'All physical copies of this book are currently issued or reserved.' });
      }
    }

    const borrowingId = `brw_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Transaction execution
    db.exec('BEGIN TRANSACTION;');
    try {
      // Mark copy as ISSUED
      db.prepare("UPDATE book_copies SET status = 'ISSUED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetCopy.id);

      // Create borrowing record
      db.prepare(`
        INSERT INTO borrowing (id, user_id, book_copy_id, issued_at, due_date, status, renewed_count)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0)
      `).run(borrowingId, userId, targetCopy.id, today, dueDate);

      // Fulfill any reservation this user had for this book
      db.prepare("UPDATE reservations SET status = 'FULFILLED' WHERE book_id = ? AND user_id = ? AND status = 'ACTIVE'").run(bookId, userId);

      // Get book title for notification
      const book = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId) as any;

      // Add notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, 'borrow')
      `).run(
        `notif_${Date.now()}`,
        userId,
        'Loan Confirmed',
        `You have borrowed "${book.title}" (Copy: ${targetCopy.accession_number}). Due date: ${dueDate}.`
      );

      db.exec('COMMIT;');

      res.status(201).json({
        message: 'Book borrowed successfully.',
        borrowingId,
        copyId: targetCopy.id,
        accessionNumber: targetCopy.accession_number,
        dueDate,
      });
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }
  } catch (error: any) {
    console.error('Error in /api/borrow:', error);
    res.status(500).json({ error: error.message || 'Failed to borrow book' });
  }
});

// -------------------------------------------------------------
// 13. CIRCULATION: RETURN A BORROWED COPY
// -------------------------------------------------------------
apiRouter.post('/return', (req: Request, res: Response) => {
  try {
    const { borrowingId, copyId } = req.body;

    let loan: any;
    if (borrowingId) {
      loan = db.prepare(`
        SELECT br.*, bc.book_id, bc.accession_number, b.title as book_title
        FROM borrowing br
        JOIN book_copies bc ON br.book_copy_id = bc.id
        JOIN books b ON bc.book_id = b.id
        WHERE br.id = ? AND br.status = 'ACTIVE'
      `).get(borrowingId);
    } else if (copyId) {
      loan = db.prepare(`
        SELECT br.*, bc.book_id, bc.accession_number, b.title as book_title
        FROM borrowing br
        JOIN book_copies bc ON br.book_copy_id = bc.id
        JOIN books b ON bc.book_id = b.id
        WHERE bc.id = ? AND br.status = 'ACTIVE'
      `).get(copyId);
    }

    if (!loan) {
      return res.status(404).json({ error: 'No active borrowing record found for this request.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if there is an active reservation waiting for this book
    const nextReservation = db.prepare(`
      SELECT r.id, r.user_id, u.name as user_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = ? AND r.status = 'ACTIVE'
      ORDER BY r.reserved_at ASC
      LIMIT 1
    `).get(loan.book_id) as any;

    const newCopyStatus = nextReservation ? 'RESERVED' : 'AVAILABLE';

    db.exec('BEGIN TRANSACTION;');
    try {
      // Mark borrowing record as RETURNED
      db.prepare(`
        UPDATE borrowing SET
          status = 'RETURNED',
          returned_at = ?
        WHERE id = ?
      `).run(today, loan.id);

      // Update copy status
      db.prepare(`
        UPDATE book_copies SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newCopyStatus, loan.book_copy_id);

      // Notification to borrower
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, 'return')
      `).run(
        `notif_${Date.now()}_1`,
        loan.user_id,
        'Book Returned',
        `"${loan.book_title}" has been successfully checked in. Thank you for returning it to the Athenaeum.`
      );

      // If reservation was waiting, notify the waiting patron
      if (nextReservation) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type)
          VALUES (?, ?, ?, ?, 'reserve')
        `).run(
          `notif_${Date.now()}_2`,
          nextReservation.user_id,
          'Reserved Book Available',
          `A physical copy of "${loan.book_title}" is now held for you at the Circulation Desk.`
        );
      }

      db.exec('COMMIT;');

      res.json({
        message: 'Book returned successfully.',
        bookTitle: loan.book_title,
        copyAccessionNumber: loan.accession_number,
        reservedForWaitingPatron: Boolean(nextReservation),
      });
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }
  } catch (error: any) {
    console.error('Error in /api/return:', error);
    res.status(500).json({ error: error.message || 'Failed to return book' });
  }
});

// -------------------------------------------------------------
// 14. CIRCULATION: RENEW A LOAN
// -------------------------------------------------------------
apiRouter.post('/renew', (req: Request, res: Response) => {
  try {
    const { borrowingId } = req.body;
    if (!borrowingId) return res.status(400).json({ error: 'Borrowing ID is required' });

    const loan = db.prepare(`
      SELECT br.*, b.title as book_title
      FROM borrowing br
      JOIN book_copies bc ON br.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE br.id = ? AND br.status = 'ACTIVE'
    `).get(borrowingId) as any;

    if (!loan) {
      return res.status(404).json({ error: 'Active loan not found' });
    }

    if (loan.renewed_count >= 2) {
      return res.status(400).json({ error: 'Maximum renewal limit reached (2 renewals allowed).' });
    }

    // Check if book has pending reservations by other users
    const hasReservations = db.prepare(`
      SELECT COUNT(*) as c 
      FROM reservations r
      JOIN book_copies bc ON bc.book_id = r.book_id
      WHERE bc.id = ? AND r.status = 'ACTIVE' AND r.user_id != ?
    `).get(loan.book_copy_id, loan.user_id) as any;

    if (hasReservations.c > 0) {
      return res.status(400).json({ error: 'Cannot renew: other patrons have placed holds on this title.' });
    }

    // Add 14 days from current due date
    const currentDue = new Date(loan.due_date);
    const newDueDate = new Date(currentDue.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare(`
      UPDATE borrowing SET
        due_date = ?,
        renewed_count = renewed_count + 1
      WHERE id = ?
    `).run(newDueDate, borrowingId);

    // Notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, 'due_soon')
    `).run(
      `notif_${Date.now()}`,
      loan.user_id,
      'Loan Renewed',
      `"${loan.book_title}" has been renewed. New due date is ${newDueDate}.`
    );

    res.json({
      message: 'Loan renewed successfully.',
      newDueDate,
      renewedCount: loan.renewed_count + 1,
    });
  } catch (error: any) {
    console.error('Error renewing loan:', error);
    res.status(500).json({ error: error.message || 'Failed to renew loan' });
  }
});

// -------------------------------------------------------------
// 15. RESERVATIONS: RESERVE A BOOK
// -------------------------------------------------------------
apiRouter.post('/reserve', (req: Request, res: Response) => {
  try {
    const { bookId, userId } = req.body;
    if (!bookId || !userId) {
      return res.status(400).json({ error: 'Book ID and User ID are required.' });
    }

    // Check if user already has an active reservation
    const existing = db.prepare("SELECT id FROM reservations WHERE book_id = ? AND user_id = ? AND status = 'ACTIVE'").get(bookId, userId);
    if (existing) {
      return res.status(400).json({ error: 'You already have an active reservation for this book.' });
    }

    const resId = `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const today = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO reservations (id, user_id, book_id, reserved_at, expiry_date, status, priority)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', 1)
    `).run(resId, userId, bookId, today, expiryDate);

    const book = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId) as any;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, 'reserve')
    `).run(
      `notif_${Date.now()}`,
      userId,
      'Reservation Placed',
      `You are on the reservation hold list for "${book?.title}". You will be notified when a copy is ready.`
    );

    res.status(201).json({
      message: 'Reservation placed successfully.',
      reservationId: resId,
      expiryDate,
    });
  } catch (error: any) {
    console.error('Error reserving book:', error);
    res.status(500).json({ error: 'Failed to place reservation' });
  }
});

apiRouter.delete('/reservations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?").run(id);
    res.json({ message: 'Reservation cancelled successfully.' });
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

// -------------------------------------------------------------
// 16. MY LIBRARY: USER'S BORROWED BOOKS, RESERVATIONS, FAVORITES, HISTORY
// -------------------------------------------------------------
apiRouter.get('/my-library', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'usr_maya';

    // Active loans
    const activeLoans = db.prepare(`
      SELECT 
        br.id as loan_id,
        br.issued_at,
        br.due_date,
        br.renewed_count,
        br.notes,
        bc.id as copy_id,
        bc.accession_number,
        bc.shelf_number,
        bc.section,
        bc.floor,
        b.id as book_id,
        b.title,
        b.subtitle,
        b.format,
        c.name as category_name,
        c.accent_color as category_color,
        (SELECT a.name FROM book_authors ba JOIN authors a ON ba.author_id = a.id WHERE ba.book_id = b.id LIMIT 1) as author_name,
        CASE 
          WHEN br.due_date < date('now') THEN 1 
          ELSE 0 
        END as is_overdue,
        CAST((julianday(br.due_date) - julianday(date('now'))) AS INTEGER) as days_remaining
      FROM borrowing br
      JOIN book_copies bc ON br.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE br.user_id = ? AND br.status = 'ACTIVE'
      ORDER BY br.due_date ASC
    `).all(userId);

    // Reading history (returned)
    const history = db.prepare(`
      SELECT 
        br.id as loan_id,
        br.issued_at,
        br.returned_at,
        bc.accession_number,
        b.id as book_id,
        b.title,
        b.subtitle,
        b.format,
        c.name as category_name,
        c.accent_color as category_color,
        (SELECT a.name FROM book_authors ba JOIN authors a ON ba.author_id = a.id WHERE ba.book_id = b.id LIMIT 1) as author_name
      FROM borrowing br
      JOIN book_copies bc ON br.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE br.user_id = ? AND br.status = 'RETURNED'
      ORDER BY br.returned_at DESC
      LIMIT 20
    `).all(userId);

    // Active reservations
    const reservations = db.prepare(`
      SELECT 
        r.id as reservation_id,
        r.reserved_at,
        r.expiry_date,
        r.status,
        b.id as book_id,
        b.title,
        b.subtitle,
        c.name as category_name,
        c.accent_color as category_color,
        (SELECT a.name FROM book_authors ba JOIN authors a ON ba.author_id = a.id WHERE ba.book_id = b.id LIMIT 1) as author_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies
      FROM reservations r
      JOIN books b ON r.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE r.user_id = ? AND r.status = 'ACTIVE'
      ORDER BY r.reserved_at DESC
    `).all(userId);

    // Favorites
    const favorites = db.prepare(`
      SELECT 
        f.id as favorite_id,
        f.created_at,
        b.id,
        b.title,
        b.subtitle,
        b.rating,
        b.format,
        b.shelf_number,
        c.name as category_name,
        c.accent_color as category_color,
        (SELECT a.name FROM book_authors ba JOIN authors a ON ba.author_id = a.id WHERE ba.book_id = b.id LIMIT 1) as author_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'AVAILABLE') as available_copies,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies
      FROM favorites f
      JOIN books b ON f.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);

    res.json({
      activeLoans,
      history,
      reservations,
      favorites,
    });
  } catch (error: any) {
    console.error('Error fetching my library:', error);
    res.status(500).json({ error: 'Failed to retrieve your library items' });
  }
});

// -------------------------------------------------------------
// 17. FAVORITES TOGGLE
// -------------------------------------------------------------
apiRouter.post('/favorites', (req: Request, res: Response) => {
  try {
    const { userId, bookId } = req.body;
    if (!userId || !bookId) return res.status(400).json({ error: 'User ID and Book ID required' });

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND book_id = ?').get(userId, bookId);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND book_id = ?').run(userId, bookId);
      return res.json({ favorited: false, message: 'Removed from favorites' });
    } else {
      const favId = `fav_${Date.now()}`;
      db.prepare('INSERT INTO favorites (id, user_id, book_id) VALUES (?, ?, ?)').run(favId, userId, bookId);
      return res.json({ favorited: true, message: 'Saved to favorites' });
    }
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});

apiRouter.delete('/favorites/:bookId', (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = (req.query.userId as string) || 'usr_maya';
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND book_id = ?').run(userId, bookId);
    res.json({ message: 'Removed from favorites' });
  } catch (error: any) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// -------------------------------------------------------------
// 18. NOTIFICATIONS
// -------------------------------------------------------------
apiRouter.get('/notifications', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'usr_maya';
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(userId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(userId) as any).c;

    res.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

apiRouter.put('/notifications/read-all', (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'usr_maya';
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
});

// -------------------------------------------------------------
// 19. USERS & AUTHENTICATION
// -------------------------------------------------------------
apiRouter.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.membership_id, u.created_at,
        (SELECT COUNT(*) FROM borrowing br WHERE br.user_id = u.id AND br.status = 'ACTIVE') as active_loans_count,
        (SELECT COUNT(*) FROM borrowing br WHERE br.user_id = u.id) as total_borrowed_count
      FROM users u
      ORDER BY u.role DESC, u.name ASC
    `).all();

    res.json(users);
  } catch (error: any) {
    console.error('Error in /api/users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

apiRouter.post('/users/role', (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const validRoles = ['Student', 'Faculty', 'Librarian', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId);
    res.json({ message: 'User role updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = db.prepare('SELECT id, name, email, role, membership_id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (!user) {
      return res.status(401).json({ error: 'No user account found with this email address.' });
    }

    res.json({ user, message: 'Logged in successfully' });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, role = 'Student' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = `usr_${Date.now()}`;
    const prefix = role === 'Faculty' ? 'FAC' : role === 'Librarian' ? 'LIB' : 'STU';
    const membershipId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, membership_id)
      VALUES (?, ?, ?, 'mock_hash', ?, ?)
    `).run(userId, name, email, role, membershipId);

    const newUser = db.prepare('SELECT id, name, email, role, membership_id FROM users WHERE id = ?').get(userId);
    res.status(201).json({ user: newUser, message: 'Account registered successfully.' });
  } catch (error: any) {
    console.error('Error registering:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// -------------------------------------------------------------
// 20. ADMIN / LIBRARIAN DASHBOARD OVERVIEW & ANALYTICS
// -------------------------------------------------------------
apiRouter.get('/admin/overview', (req: Request, res: Response) => {
  try {
    // Recent borrowing transactions
    const recentTransactions = db.prepare(`
      SELECT 
        br.id,
        br.issued_at,
        br.due_date,
        br.returned_at,
        br.status,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        b.title as book_title,
        bc.accession_number
      FROM borrowing br
      JOIN users u ON br.user_id = u.id
      JOIN book_copies bc ON br.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      ORDER BY br.created_at DESC
      LIMIT 10
    `).all();

    // Overdue loans
    const overdueLoans = db.prepare(`
      SELECT 
        br.id,
        br.issued_at,
        br.due_date,
        u.name as user_name,
        u.email as user_email,
        b.title as book_title,
        bc.accession_number,
        CAST((julianday(date('now')) - julianday(br.due_date)) AS INTEGER) as days_overdue
      FROM borrowing br
      JOIN users u ON br.user_id = u.id
      JOIN book_copies bc ON br.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE br.status = 'ACTIVE' AND br.due_date < date('now')
      ORDER BY br.due_date ASC
      LIMIT 10
    `).all();

    // Category breakdown
    const categoryDistribution = db.prepare(`
      SELECT 
        c.name,
        c.accent_color,
        COUNT(b.id) as book_count,
        (SELECT COUNT(*) FROM book_copies bc JOIN books b2 ON bc.book_id = b2.id WHERE b2.category_id = c.id) as copy_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY book_count DESC
    `).all();

    // Copy health statuses
    const copyConditions = db.prepare(`
      SELECT condition, COUNT(*) as count 
      FROM book_copies 
      GROUP BY condition
    `).all();

    const copyStatuses = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM book_copies 
      GROUP BY status
    `).all();

    res.json({
      recentTransactions,
      overdueLoans,
      categoryDistribution,
      copyConditions,
      copyStatuses,
    });
  } catch (error: any) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Failed to retrieve admin overview' });
  }
});

// -------------------------------------------------------------
// 21. DATABASE RE-SYNC & BATCH INGESTION ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/admin/sync-database', (req: Request, res: Response) => {
  try {
    const result = syncDatabaseCatalog();
    res.json({
      success: true,
      message: `Database synchronized successfully. Catalog contains ${result.totalBooks} titles, ${result.totalCopies} physical copies, ${result.totalAuthors} authors, and ${result.totalCategories} categories.`,
      stats: result,
    });
  } catch (error: any) {
    console.error('Error syncing database:', error);
    res.status(500).json({ error: error.message || 'Database synchronization failed' });
  }
});

apiRouter.post('/admin/batch-import', (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of books to import in "items".' });
    }

    let insertedBooks = 0;
    let insertedCopies = 0;

    const insertBook = db.prepare(`
      INSERT OR REPLACE INTO books (
        id, title, subtitle, description, isbn10, isbn13, publisher,
        publication_year, publication_date, edition, language, page_count, format,
        category_id, shelf_number, section, floor, rating, rating_count, featured, popular_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAuthor = db.prepare(`
      INSERT OR IGNORE INTO authors (id, name, biography) VALUES (?, ?, ?)
    `);

    const insertBookAuthor = db.prepare(`
      INSERT OR IGNORE INTO book_authors (book_id, author_id, is_primary) VALUES (?, ?, 1)
    `);

    const insertCopy = db.prepare(`
      INSERT OR REPLACE INTO book_copies (
        id, book_id, accession_number, shelf_number, section, floor, status, condition
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      if (!item.title) continue;
      const cleanTitle = String(item.title).trim();
      const bookId = item.id || `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const authorName = item.author ? String(item.author).trim() : 'Academic Scholar';
      const authId = `auth_${authorName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;

      insertAuthor.run(authId, authorName, `Scholar and author of ${cleanTitle}`);

      const categoryId = item.categoryId || item.category || 'cat_engineering';
      const shelf = item.shelfNumber || item.shelf_number || 'A-01';
      const section = item.section || 'General Stacks';
      const floor = Number(item.floor) || 1;
      const pubYear = Number(item.year || item.publication_year) || 2025;
      const copiesCount = Math.max(1, Number(item.copiesCount || item.copies) || 1);
      const isbn13 = item.isbn13 || item.isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      insertBook.run(
        bookId,
        cleanTitle,
        item.subtitle || null,
        item.description || `${cleanTitle} by ${authorName}. Institutional reference catalog entry.`,
        item.isbn10 || null,
        isbn13,
        item.publisher || 'University Press',
        pubYear,
        item.publicationDate || `${pubYear}-01-01`,
        item.edition || 'Library Edition',
        item.language || 'English',
        Number(item.pageCount) || 320,
        item.format || 'Hardcover',
        categoryId,
        shelf,
        section,
        floor,
        Number(item.rating) || 4.5,
        Number(item.ratingCount) || 12,
        item.featured ? 1 : 0,
        Number(item.popularScore) || 50
      );

      insertBookAuthor.run(bookId, authId);
      insertedBooks++;

      for (let i = 0; i < copiesCount; i++) {
        const accNum = item.accNo ? `${item.accNo}${i > 0 ? `-${i+1}` : ''}` : `ACC-${Math.floor(100000 + Math.random() * 900000)}`;
        const copyId = `cp_${accNum}`;
        insertCopy.run(
          copyId,
          bookId,
          accNum,
          shelf,
          section,
          floor,
          'AVAILABLE',
          'Good'
        );
        insertedCopies++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed and updated ${insertedBooks} book(s) and ${insertedCopies} physical copy/copies in the database.`,
      insertedBooks,
      insertedCopies,
    });
  } catch (error: any) {
    console.error('Error in batch import:', error);
    res.status(500).json({ error: error.message || 'Batch import failed' });
  }
});

// -------------------------------------------------------------
// 22. DIGITAL READING ROOM & INTERACTIVE READER ENDPOINTS
// -------------------------------------------------------------

// Fetch reader data (book metadata, table of contents/chapters, and saved progress)
apiRouter.get('/books/:id/reader', (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const userId = req.query.userId as string | undefined;

    // Fetch full book details with authors & category
    const book = db.prepare(`
      SELECT 
        b.*,
        c.name as category_name,
        c.slug as category_slug,
        c.accent_color as category_color,
        c.icon as category_icon,
        (
          SELECT json_group_array(
            json_object(
              'id', a.id,
              'name', a.name,
              'biography', a.biography,
              'photo_url', a.photo_url
            )
          )
          FROM book_authors ba
          JOIN authors a ON ba.author_id = a.id
          WHERE ba.book_id = b.id
        ) as authors_json
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(bookId) as any;

    if (!book) {
      return res.status(404).json({ error: 'Book volume not found' });
    }

    if (book.authors_json) {
      try {
        book.authors = JSON.parse(book.authors_json);
      } catch {
        book.authors = [];
      }
      delete book.authors_json;
    }

    // Ensure rich chapters are seeded and fetched
    const chapters = ensureBookChapters(bookId);

    // Fetch reading progress if user provided
    let progress: any = null;
    if (userId) {
      const progressRow = db.prepare(`
        SELECT * FROM reading_progress 
        WHERE user_id = ? AND book_id = ?
      `).get(userId, bookId) as any;

      if (progressRow) {
        progress = {
          ...progressRow,
          bookmarks: JSON.parse(progressRow.bookmarks || '[]'),
          highlights: JSON.parse(progressRow.highlights || '[]'),
        };
      }
    }

    res.json({
      book,
      chapters,
      progress,
    });
  } catch (error: any) {
    console.error('Error fetching reader data:', error);
    res.status(500).json({ error: error.message || 'Failed to open digital reader' });
  }
});

// Update user reading progress (current chapter, percent, scroll position, time spent)
apiRouter.post('/reading/progress', (req: Request, res: Response) => {
  try {
    const {
      userId,
      bookId,
      currentChapterIndex = 0,
      progressPercent = 0,
      scrollPosition = 0,
      timeSpentSeconds = 0,
    } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ error: 'userId and bookId are required' });
    }

    const existing = db.prepare(`
      SELECT id, total_reading_time_seconds 
      FROM reading_progress 
      WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId) as any;

    if (existing) {
      const newTotalTime = (existing.total_reading_time_seconds || 0) + (Number(timeSpentSeconds) || 0);
      db.prepare(`
        UPDATE reading_progress 
        SET 
          current_chapter_index = ?,
          progress_percent = ?,
          scroll_position = ?,
          total_reading_time_seconds = ?,
          last_read_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        Number(currentChapterIndex) || 0,
        Number(progressPercent) || 0,
        Number(scrollPosition) || 0,
        newTotalTime,
        existing.id
      );
    } else {
      const progressId = `prog_${userId}_${bookId}`;
      db.prepare(`
        INSERT INTO reading_progress (
          id, user_id, book_id, current_chapter_index, progress_percent, scroll_position, total_reading_time_seconds, last_read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        progressId,
        userId,
        bookId,
        Number(currentChapterIndex) || 0,
        Number(progressPercent) || 0,
        Number(scrollPosition) || 0,
        Number(timeSpentSeconds) || 0
      );
    }

    res.json({ success: true, message: 'Reading progress synchronized' });
  } catch (error: any) {
    console.error('Error saving reading progress:', error);
    res.status(500).json({ error: 'Failed to record reading progress' });
  }
});

// Add bookmark
apiRouter.post('/reading/bookmark', (req: Request, res: Response) => {
  try {
    const { userId, bookId, chapterIndex, chapterTitle, excerpt } = req.body;
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'userId and bookId are required' });
    }

    const progressRow = db.prepare(`
      SELECT id, bookmarks FROM reading_progress WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId) as any;

    const newBookmark = {
      id: `bm_${Date.now()}`,
      chapter_index: Number(chapterIndex) || 0,
      chapter_title: chapterTitle || `Chapter ${Number(chapterIndex) + 1}`,
      excerpt: excerpt || '',
      created_at: new Date().toISOString(),
    };

    if (progressRow) {
      const bookmarks = JSON.parse(progressRow.bookmarks || '[]');
      bookmarks.push(newBookmark);
      db.prepare(`
        UPDATE reading_progress SET bookmarks = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(JSON.stringify(bookmarks), progressRow.id);
    } else {
      const progressId = `prog_${userId}_${bookId}`;
      db.prepare(`
        INSERT INTO reading_progress (id, user_id, book_id, bookmarks, current_chapter_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(progressId, userId, bookId, JSON.stringify([newBookmark]), Number(chapterIndex) || 0);
    }

    res.json({ success: true, bookmark: newBookmark });
  } catch (error: any) {
    console.error('Error saving bookmark:', error);
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

// Delete bookmark
apiRouter.delete('/reading/bookmark', (req: Request, res: Response) => {
  try {
    const { userId, bookId, bookmarkId } = req.body;
    const progressRow = db.prepare(`
      SELECT id, bookmarks FROM reading_progress WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId) as any;

    if (progressRow) {
      const bookmarks = JSON.parse(progressRow.bookmarks || '[]');
      const filtered = bookmarks.filter((b: any) => b.id !== bookmarkId);
      db.prepare('UPDATE reading_progress SET bookmarks = ? WHERE id = ?').run(
        JSON.stringify(filtered),
        progressRow.id
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// Add or update highlight & marginal note
apiRouter.post('/reading/highlight', (req: Request, res: Response) => {
  try {
    const { userId, bookId, chapterIndex, text, color = 'amber', note = '' } = req.body;
    if (!userId || !bookId || !text) {
      return res.status(400).json({ error: 'userId, bookId, and text are required' });
    }

    const progressRow = db.prepare(`
      SELECT id, highlights FROM reading_progress WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId) as any;

    const newHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chapter_index: Number(chapterIndex) || 0,
      text: String(text).trim(),
      color,
      note,
      created_at: new Date().toISOString(),
    };

    if (progressRow) {
      const highlights = JSON.parse(progressRow.highlights || '[]');
      highlights.push(newHighlight);
      db.prepare(`
        UPDATE reading_progress SET highlights = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(JSON.stringify(highlights), progressRow.id);
    } else {
      const progressId = `prog_${userId}_${bookId}`;
      db.prepare(`
        INSERT INTO reading_progress (id, user_id, book_id, highlights, current_chapter_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(progressId, userId, bookId, JSON.stringify([newHighlight]), Number(chapterIndex) || 0);
    }

    res.json({ success: true, highlight: newHighlight });
  } catch (error: any) {
    console.error('Error saving highlight:', error);
    res.status(500).json({ error: 'Failed to save highlight' });
  }
});

// Delete highlight
apiRouter.delete('/reading/highlight', (req: Request, res: Response) => {
  try {
    const { userId, bookId, highlightId } = req.body;
    const progressRow = db.prepare(`
      SELECT id, highlights FROM reading_progress WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId) as any;

    if (progressRow) {
      const highlights = JSON.parse(progressRow.highlights || '[]');
      const filtered = highlights.filter((h: any) => h.id !== highlightId);
      db.prepare('UPDATE reading_progress SET highlights = ? WHERE id = ?').run(
        JSON.stringify(filtered),
        progressRow.id
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// Get user recent reading shelf
apiRouter.get('/reading/recent', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const rows = db.prepare(`
      SELECT 
        rp.*,
        b.title,
        b.subtitle,
        b.cover_image_url,
        b.rating,
        b.format,
        c.name as category_name,
        c.slug as category_slug,
        c.accent_color as category_color,
        (
          SELECT a.name 
          FROM authors a 
          JOIN book_authors ba ON a.id = ba.author_id 
          WHERE ba.book_id = b.id 
          LIMIT 1
        ) as author_name,
        (
          SELECT COUNT(*) 
          FROM book_chapters bc 
          WHERE bc.book_id = b.id
        ) as total_chapters
      FROM reading_progress rp
      JOIN books b ON rp.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE rp.user_id = ?
      ORDER BY rp.last_read_at DESC
      LIMIT 10
    `).all(userId) as any[];

    const formatted = rows.map((r) => ({
      ...r,
      bookmarks: JSON.parse(r.bookmarks || '[]'),
      highlights: JSON.parse(r.highlights || '[]'),
      book: {
        id: r.book_id,
        title: r.title,
        subtitle: r.subtitle,
        cover_image_url: r.cover_image_url,
        rating: r.rating,
        format: r.format,
        category_name: r.category_name,
        category_slug: r.category_slug,
        category_color: r.category_color,
        author_name: r.author_name,
      },
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching recent reading:', error);
    res.status(500).json({ error: 'Failed to load reading shelf' });
  }
});


