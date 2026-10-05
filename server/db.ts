import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { importEntries, CUBookEntry } from '../scripts/import_cu_data.ts';
import { cuRecords } from '../scripts/run_import.ts';

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel
  ? path.resolve('/tmp', 'athenaeum-data')
  : path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'library.db');

// If on Vercel, copy pre-seeded database from the bundled repository if present in /tmp
if (isVercel) {
  const bundledDbPath = path.resolve(process.cwd(), 'data', 'library.db');
  if (fs.existsSync(bundledDbPath) && !fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, dbPath);
      console.log('Copied bundled library database to /tmp for Vercel execution.');
    } catch (err) {
      console.warn('Could not copy bundled database to /tmp:', err);
    }
  }
}

export const db = new DatabaseSync(dbPath);

// Enable foreign keys and journal mode for durability and relational integrity
try {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
} catch {
  db.exec('PRAGMA journal_mode = MEMORY;');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      accent_color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      biography TEXT,
      photo_url TEXT,
      birth_year INTEGER,
      nationality TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT NOT NULL,
      isbn10 TEXT,
      isbn13 TEXT UNIQUE,
      publisher TEXT,
      publication_year INTEGER,
      publication_date TEXT,
      edition TEXT,
      language TEXT DEFAULT 'English',
      page_count INTEGER,
      format TEXT DEFAULT 'Hardcover',
      cover_image_url TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      shelf_number TEXT,
      section TEXT,
      floor INTEGER DEFAULT 1,
      rating REAL DEFAULT 4.5,
      rating_count INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      popular_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_authors (
      book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
      author_id TEXT REFERENCES authors(id) ON DELETE CASCADE,
      is_primary INTEGER DEFAULT 1,
      PRIMARY KEY (book_id, author_id)
    );

    CREATE TABLE IF NOT EXISTS book_copies (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      accession_number TEXT UNIQUE NOT NULL,
      shelf_number TEXT,
      section TEXT,
      floor INTEGER DEFAULT 1,
      status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'ISSUED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'
      condition TEXT DEFAULT 'Good',   -- 'Pristine', 'Good', 'Fair', 'Worn'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_image TEXT,
      role TEXT DEFAULT 'Student', -- 'Student', 'Faculty', 'Librarian', 'Admin'
      membership_id TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS borrowing (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_copy_id TEXT NOT NULL REFERENCES book_copies(id) ON DELETE CASCADE,
      issued_at TEXT NOT NULL,
      due_date TEXT NOT NULL,
      returned_at TEXT,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'RETURNED', 'OVERDUE', 'LOST'
      renewed_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      reserved_at TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED'
      priority INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      reading_minutes INTEGER DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, chapter_index)
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      current_chapter_index INTEGER DEFAULT 0,
      progress_percent REAL DEFAULT 0,
      scroll_position REAL DEFAULT 0,
      total_reading_time_seconds INTEGER DEFAULT 0,
      bookmarks TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '[]',
      last_read_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    -- Indexes for high performance searches and joins
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
    CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
    CREATE INDEX IF NOT EXISTS idx_books_year ON books(publication_year);
    CREATE INDEX IF NOT EXISTS idx_copies_book ON book_copies(book_id);
    CREATE INDEX IF NOT EXISTS idx_copies_status ON book_copies(status);
    CREATE INDEX IF NOT EXISTS idx_book_authors_author ON book_authors(author_id);
    CREATE INDEX IF NOT EXISTS idx_borrowing_user ON borrowing(user_id);
    CREATE INDEX IF NOT EXISTS idx_borrowing_status ON borrowing(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_book ON book_chapters(book_id);
    CREATE INDEX IF NOT EXISTS idx_reading_user ON reading_progress(user_id);
  `);

  // Check if initial seeding is needed
  const countRow = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  if (countRow.count === 0) {
    seedInitialData();
  }

  // Ensure university accession catalog is also populated
  const cuCountRow = db.prepare("SELECT COUNT(*) as count FROM books WHERE id LIKE 'bk_cu_%'").get() as { count: number };
  if (cuCountRow.count === 0) {
    console.log('Ingesting university accession catalog records into SQLite database...');
    importEntries(cuRecords);
  }
}

export function syncDatabaseCatalog() {
  const cuCountRow = db.prepare("SELECT COUNT(*) as count FROM books WHERE id LIKE 'bk_cu_%'").get() as { count: number };
  if (cuCountRow.count === 0) {
    importEntries(cuRecords);
  }
  const totalBooks = (db.prepare('SELECT COUNT(*) as c FROM books').get() as any).c;
  const totalCopies = (db.prepare('SELECT COUNT(*) as c FROM book_copies').get() as any).c;
  const totalAuthors = (db.prepare('SELECT COUNT(*) as c FROM authors').get() as any).c;
  const totalCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c;
  return { totalBooks, totalCopies, totalAuthors, totalCategories };
}

function seedInitialData() {
  console.log('Seeding initial library catalog and users into SQLite...');

  // 1. Categories
  const categories = [
    {
      id: 'cat_fiction',
      name: 'Fiction & Literature',
      slug: 'fiction',
      description: 'Classic and modern novels, speculative fiction, and enduring prose narratives.',
      icon: 'BookOpen',
      accent_color: '#8B3A2B',
    },
    {
      id: 'cat_compsci',
      name: 'Computer Science & AI',
      slug: 'computer-science',
      description: 'Foundations of computing, algorithmic theory, machine learning, and systems architecture.',
      icon: 'Cpu',
      accent_color: '#1E3A8A',
    },
    {
      id: 'cat_science',
      name: 'Science & Physics',
      slug: 'science',
      description: 'Astrophysics, quantum mechanics, organic chemistry, and explorations of the cosmos.',
      icon: 'Atom',
      accent_color: '#14532D',
    },
    {
      id: 'cat_philosophy',
      name: 'Philosophy & Ethics',
      slug: 'philosophy',
      description: 'Classical inquiry, epistemology, existential contemplation, and moral systems.',
      icon: 'Compass',
      accent_color: '#78350F',
    },
    {
      id: 'cat_history',
      name: 'World History',
      slug: 'history',
      description: 'Civilization trajectories, pivotal revolutions, global chronicles, and archival memoirs.',
      icon: 'Landmark',
      accent_color: '#4C1D95',
    },
    {
      id: 'cat_math',
      name: 'Mathematics',
      slug: 'mathematics',
      description: 'Pure and applied mathematics, discrete structures, topology, and number theory.',
      icon: 'Sigma',
      accent_color: '#0F766E',
    },
    {
      id: 'cat_biography',
      name: 'Biography & Memoir',
      slug: 'biography',
      description: 'Illuminating life stories of scientific visionaries, thinkers, and historical leaders.',
      icon: 'UserCheck',
      accent_color: '#B45309',
    },
    {
      id: 'cat_psychology',
      name: 'Psychology & Mind',
      slug: 'psychology',
      description: 'Cognitive behavioral science, decision architectures, and human perception.',
      icon: 'Brain',
      accent_color: '#9333EA',
    },
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, slug, description, icon, accent_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const cat of categories) {
    insertCategory.run(cat.id, cat.name, cat.slug, cat.description, cat.icon, cat.accent_color);
  }

  // 2. Authors
  const authors = [
    {
      id: 'auth_knuth',
      name: 'Donald E. Knuth',
      biography: 'Professor Emeritus of the Art of Computer Programming at Stanford University, pioneer of algorithm analysis, and creator of TeX typesetting.',
      photo_url: '',
      birth_year: 1938,
      nationality: 'American',
    },
    {
      id: 'auth_feynman',
      name: 'Richard P. Feynman',
      biography: 'Theoretical physicist, Nobel laureate known for quantum electrodynamics, path integral formulation, and legendary physics lectures.',
      photo_url: '',
      birth_year: 1918,
      nationality: 'American',
    },
    {
      id: 'auth_asimov',
      name: 'Isaac Asimov',
      biography: 'Master of speculative science fiction and biochemist, celebrated for the Foundation series and the Three Laws of Robotics.',
      photo_url: '',
      birth_year: 1920,
      nationality: 'American',
    },
    {
      id: 'auth_leguin',
      name: 'Ursula K. Le Guin',
      biography: 'Renowned novelist and essayist whose works in Earthsea and the Hainish Cycle explored anthropology, sociology, and gender ethics.',
      photo_url: '',
      birth_year: 1929,
      nationality: 'American',
    },
    {
      id: 'auth_turing',
      name: 'Alan Turing',
      biography: 'Mathematician, cryptanalyst, and founding father of modern computer science and artificial intelligence.',
      photo_url: '',
      birth_year: 1912,
      nationality: 'British',
    },
    {
      id: 'auth_aurelius',
      name: 'Marcus Aurelius',
      biography: 'Roman Emperor from 161 to 180 AD and Stoic philosopher whose personal meditations remain seminal texts on duty, serenity, and reason.',
      photo_url: '',
      birth_year: 121,
      nationality: 'Roman',
    },
    {
      id: 'auth_sagan',
      name: 'Carl Sagan',
      biography: 'Astronomer, planetary scientist, and Pulitzer Prize-winning communicator of scientific wonder and extraterrestrial search.',
      photo_url: '',
      birth_year: 1934,
      nationality: 'American',
    },
    {
      id: 'auth_harari',
      name: 'Yuval Noah Harari',
      biography: 'Historian, philosopher, and professor at the Hebrew University of Jerusalem, focusing on macro-historical human development.',
      photo_url: '',
      birth_year: 1976,
      nationality: 'Israeli',
    },
    {
      id: 'auth_austen',
      name: 'Jane Austen',
      biography: 'English novelist known for her realism, keen social commentary, and masterworks exploring courtship and societal mores.',
      photo_url: '',
      birth_year: 1775,
      nationality: 'British',
    },
    {
      id: 'auth_isaacson',
      name: 'Walter Isaacson',
      biography: 'Biographer and journalist, former editor of Time and CEO of the Aspen Institute, chronicler of Da Vinci, Einstein, and Steve Jobs.',
      photo_url: '',
      birth_year: 1952,
      nationality: 'American',
    },
    {
      id: 'auth_kahneman',
      name: 'Daniel Kahneman',
      biography: 'Nobel Memorial Prize laureate in Economic Sciences and behavioral psychologist pioneer of prospect theory and cognitive biases.',
      photo_url: '',
      birth_year: 1934,
      nationality: 'Israeli-American',
    },
    {
      id: 'auth_lovelace',
      name: 'Ada Lovelace',
      biography: 'Mathematician widely recognized as the world’s first computer programmer for her work on Babbage’s Analytical Engine.',
      photo_url: '',
      birth_year: 1815,
      nationality: 'British',
    },
    {
      id: 'auth_clear',
      name: 'James Clear',
      biography: 'Author and speaker focused on habitual formation, continuous micro-improvement, and behavioral systems.',
      photo_url: '',
      birth_year: 1986,
      nationality: 'American',
    },
    {
      id: 'auth_marquez',
      name: 'Gabriel García Márquez',
      biography: 'Colombian author and Nobel Prize laureate, master of magical realism whose works capture the Latin American spirit.',
      photo_url: '',
      birth_year: 1927,
      nationality: 'Colombian',
    },
    {
      id: 'auth_shelley',
      name: 'Mary Shelley',
      biography: 'Romantic novelist and author of Frankenstein, widely heralded as the earliest progenitor of modern science fiction.',
      photo_url: '',
      birth_year: 1797,
      nationality: 'British',
    },
    {
      id: 'auth_abelson',
      name: 'Harold Abelson',
      biography: 'Professor of Computer Science and Engineering at MIT, co-creator of MIT OpenCourseWare and advocate for computational literacy.',
      photo_url: '',
      birth_year: 1947,
      nationality: 'American',
    },
    {
      id: 'auth_sussman',
      name: 'Gerald Jay Sussman',
      biography: 'Matsushita Professor of Electrical Engineering at MIT, co-developer of Scheme programming language and artificial intelligence researcher.',
      photo_url: '',
      birth_year: 1947,
      nationality: 'American',
    },
  ];

  const insertAuthor = db.prepare(`
    INSERT INTO authors (id, name, biography, photo_url, birth_year, nationality)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const auth of authors) {
    insertAuthor.run(auth.id, auth.name, auth.biography, auth.photo_url, auth.birth_year, auth.nationality);
  }

  // 3. Books
  const books = [
    {
      id: 'bk_taocp_v1',
      title: 'The Art of Computer Programming, Vol 1',
      subtitle: 'Fundamental Algorithms',
      description: 'The monumental benchmark of classical computer science. Covering basic concepts, information structures, linear lists, trees, and multilinked structures with mathematical rigor.',
      isbn10: '0201896834',
      isbn13: '978-0201896831',
      publisher: 'Addison-Wesley Professional',
      publication_year: 1997,
      publication_date: '1997-07-04',
      edition: '3rd Edition',
      language: 'English',
      page_count: 672,
      format: 'Hardcover',
      category_id: 'cat_compsci',
      authors: ['auth_knuth'],
      shelf_number: 'CS-01',
      section: 'Systems & Algorithms Hall',
      floor: 2,
      rating: 4.9,
      rating_count: 1420,
      featured: 1,
      popular_score: 95,
      copies: 4,
    },
    {
      id: 'bk_sicp',
      title: 'Structure and Interpretation of Computer Programs',
      subtitle: 'JavaScript Edition',
      description: 'The legendary MIT text that redefines how one thinks about computation, abstraction, metaprogramming, and interpreter design.',
      isbn10: '0262543230',
      isbn13: '978-0262543231',
      publisher: 'The MIT Press',
      publication_year: 2022,
      publication_date: '2022-04-12',
      edition: 'Special Edition',
      language: 'English',
      page_count: 680,
      format: 'Hardcover',
      category_id: 'cat_compsci',
      authors: ['auth_abelson', 'auth_sussman'],
      shelf_number: 'CS-04',
      section: 'Systems & Algorithms Hall',
      floor: 2,
      rating: 4.9,
      rating_count: 980,
      featured: 1,
      popular_score: 92,
      copies: 5,
    },
    {
      id: 'bk_feynman_lectures',
      title: 'The Feynman Lectures on Physics',
      subtitle: 'Volume I: Mainly Mechanics, Radiation, and Heat',
      description: 'A masterpiece of physics exposition by Nobel laureate Richard Feynman. Unravels the underlying mechanics, atomic hypothesis, and thermodynamics of our physical reality.',
      isbn10: '0465024939',
      isbn13: '978-0465024933',
      publisher: 'Basic Books',
      publication_year: 2011,
      publication_date: '2011-01-04',
      edition: 'Definitive Edition',
      language: 'English',
      page_count: 560,
      format: 'Hardcover',
      category_id: 'cat_science',
      authors: ['auth_feynman'],
      shelf_number: 'PH-12',
      section: 'Natural Philosophy & Physics Wing',
      floor: 3,
      rating: 4.8,
      rating_count: 2150,
      featured: 1,
      popular_score: 98,
      copies: 4,
    },
    {
      id: 'bk_cosmos',
      title: 'Cosmos',
      subtitle: 'A Personal Voyage',
      description: 'A lyrical, profound journey through fifteen billion years of cosmic evolution. Traces the origin of matter, life, human consciousness, and interstellar horizons.',
      isbn10: '0345539435',
      isbn13: '978-0345539434',
      publisher: 'Ballantine Books',
      publication_year: 2013,
      publication_date: '2013-12-10',
      edition: 'Modern Illustrated',
      language: 'English',
      page_count: 432,
      format: 'Paperback',
      category_id: 'cat_science',
      authors: ['auth_sagan'],
      shelf_number: 'AST-03',
      section: 'Astronomy & Astrophysics Gallery',
      floor: 3,
      rating: 4.9,
      rating_count: 3200,
      featured: 1,
      popular_score: 96,
      copies: 5,
    },
    {
      id: 'bk_foundation',
      title: 'Foundation',
      subtitle: 'The Galactic Empire Chronicle',
      description: 'Hari Seldon discovers psychohistory—a mathematical science capable of predicting the collapse of the Galactic Empire and initiates the preservation of human knowledge.',
      isbn10: '0553293354',
      isbn13: '978-0553293357',
      publisher: 'Spectra',
      publication_year: 1991,
      publication_date: '1991-10-01',
      edition: 'Deluxe Paperback',
      language: 'English',
      page_count: 256,
      format: 'Paperback',
      category_id: 'cat_fiction',
      authors: ['auth_asimov'],
      shelf_number: 'FIC-A07',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.7,
      rating_count: 4100,
      featured: 1,
      popular_score: 94,
      copies: 4,
    },
    {
      id: 'bk_left_hand_darkness',
      title: 'The Left Hand of Darkness',
      subtitle: 'The Hainish Cycle',
      description: 'A groundbreaking work of speculative literature set on the frozen planet of Gethen, examining politics, diplomacy, identity, and the boundaries of human empathy.',
      isbn10: '0441478123',
      isbn13: '978-0441478125',
      publisher: 'Ace Books',
      publication_year: 2000,
      publication_date: '2000-03-07',
      edition: '50th Anniversary Edition',
      language: 'English',
      page_count: 336,
      format: 'Hardcover',
      category_id: 'cat_fiction',
      authors: ['auth_leguin'],
      shelf_number: 'FIC-L03',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.6,
      rating_count: 1850,
      featured: 0,
      popular_score: 87,
      copies: 3,
    },
    {
      id: 'bk_meditations',
      title: 'Meditations',
      subtitle: 'A New Translation and Commentary',
      description: 'Private reflections of the Stoic Emperor on impermanence, integrity, emotional equilibrium, and the pursuit of virtue amidst turbulent circumstance.',
      isbn10: '0812968255',
      isbn13: '978-0812968255',
      publisher: 'Modern Library',
      publication_year: 2002,
      publication_date: '2002-05-14',
      edition: 'Hays Translation',
      language: 'English',
      page_count: 256,
      format: 'Hardcover',
      category_id: 'cat_philosophy',
      authors: ['auth_aurelius'],
      shelf_number: 'PHI-08',
      section: 'Classical Philosophy Room',
      floor: 2,
      rating: 4.8,
      rating_count: 5300,
      featured: 1,
      popular_score: 99,
      copies: 6,
    },
    {
      id: 'bk_sapiens',
      title: 'Sapiens',
      subtitle: 'A Brief History of Humankind',
      description: 'Explores how an insignificant ape became the ruler of planet Earth through the cognitive, agricultural, and scientific revolutions.',
      isbn10: '0062316095',
      isbn13: '978-0062316097',
      publisher: 'Harper',
      publication_year: 2015,
      publication_date: '2015-02-10',
      edition: '1st US Edition',
      language: 'English',
      page_count: 464,
      format: 'Hardcover',
      category_id: 'cat_history',
      authors: ['auth_harari'],
      shelf_number: 'HIS-21',
      section: 'World Civilizations Annex',
      floor: 2,
      rating: 4.7,
      rating_count: 8200,
      featured: 1,
      popular_score: 97,
      copies: 5,
    },
    {
      id: 'bk_thinking_fast_slow',
      title: 'Thinking, Fast and Slow',
      subtitle: 'Two Systems of Human Judgment',
      description: 'A tour of the human mind examining System 1 (fast, intuitive, emotional) and System 2 (slow, deliberative, logical), and the cognitive biases governing choices.',
      isbn10: '0374533555',
      isbn13: '978-0374533557',
      publisher: 'Farrar, Straus and Giroux',
      publication_year: 2013,
      publication_date: '2013-04-02',
      edition: 'Paperback Edition',
      language: 'English',
      page_count: 512,
      format: 'Paperback',
      category_id: 'cat_psychology',
      authors: ['auth_kahneman'],
      shelf_number: 'PSY-14',
      section: 'Behavioral Sciences Reading Room',
      floor: 3,
      rating: 4.6,
      rating_count: 4700,
      featured: 0,
      popular_score: 91,
      copies: 4,
    },
    {
      id: 'bk_pride_prejudice',
      title: 'Pride and Prejudice',
      subtitle: 'An Authoritative Critical Edition',
      description: 'The sparkling comedy of manners chronicling the clash of personalities between Elizabeth Bennet and the enigmatic Mr. Darcy.',
      isbn10: '0141439513',
      isbn13: '978-0141439518',
      publisher: 'Penguin Classics',
      publication_year: 2002,
      publication_date: '2002-12-31',
      edition: 'Revised Classics Edition',
      language: 'English',
      page_count: 480,
      format: 'Hardcover',
      category_id: 'cat_fiction',
      authors: ['auth_austen'],
      shelf_number: 'FIC-A01',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.8,
      rating_count: 6100,
      featured: 0,
      popular_score: 89,
      copies: 5,
    },
    {
      id: 'bk_innovators',
      title: 'The Innovators',
      subtitle: 'How a Group of Hackers, Geniuses, and Geeks Created the Digital Revolution',
      description: 'From Ada Lovelace and Alan Turing to Steve Jobs and Tim Berners-Lee, Walter Isaacson chronicles the collaborative genius behind modern computing.',
      isbn10: '1476708703',
      isbn13: '978-1476708706',
      publisher: 'Simon & Schuster',
      publication_year: 2014,
      publication_date: '2014-10-07',
      edition: '1st Edition',
      language: 'English',
      page_count: 560,
      format: 'Hardcover',
      category_id: 'cat_biography',
      authors: ['auth_isaacson'],
      shelf_number: 'BIO-19',
      section: 'Biographical Archive',
      floor: 2,
      rating: 4.7,
      rating_count: 2400,
      featured: 0,
      popular_score: 86,
      copies: 3,
    },
    {
      id: 'bk_frankenstein',
      title: 'Frankenstein',
      subtitle: 'The 1818 Text',
      description: 'Mary Shelley’s immortal gothic tale of scientific ambition, hubris, alienation, and the moral consequence of creating life in defiance of nature.',
      isbn10: '0143131842',
      isbn13: '978-0143131847',
      publisher: 'Penguin Books',
      publication_year: 2018,
      publication_date: '2018-01-16',
      edition: '200th Bicentennial Edition',
      language: 'English',
      page_count: 288,
      format: 'Paperback',
      category_id: 'cat_fiction',
      authors: ['auth_shelley'],
      shelf_number: 'FIC-S11',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.5,
      rating_count: 3800,
      featured: 0,
      popular_score: 84,
      copies: 4,
    },
    {
      id: 'bk_atomic_habits',
      title: 'Atomic Habits',
      subtitle: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
      description: 'A transformative framework for making tiny changes that yield remarkable long-term compound results in personal and intellectual craft.',
      isbn10: '0735211299',
      isbn13: '978-0735211292',
      publisher: 'Avery',
      publication_year: 2018,
      publication_date: '2018-10-16',
      edition: 'Hardcover Edition',
      language: 'English',
      page_count: 320,
      format: 'Hardcover',
      category_id: 'cat_psychology',
      authors: ['auth_clear'],
      shelf_number: 'PSY-02',
      section: 'Behavioral Sciences Reading Room',
      floor: 3,
      rating: 4.9,
      rating_count: 9400,
      featured: 1,
      popular_score: 99,
      copies: 6,
    },
    {
      id: 'bk_one_hundred_years',
      title: 'One Hundred Years of Solitude',
      subtitle: 'The Buendía Dynasty of Macondo',
      description: 'The magnum opus of magical realism recounting the rise and fall of the mythical town of Macondo through seven generations of the Buendía family.',
      isbn10: '0060883286',
      isbn13: '978-0060883287',
      publisher: 'Harper Perennial',
      publication_year: 2006,
      publication_date: '2006-02-21',
      edition: 'Rabassa Translation',
      language: 'English',
      page_count: 448,
      format: 'Hardcover',
      category_id: 'cat_fiction',
      authors: ['auth_marquez'],
      shelf_number: 'FIC-M09',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.7,
      rating_count: 4500,
      featured: 1,
      popular_score: 93,
      copies: 4,
    },
    {
      id: 'bk_computable_numbers',
      title: 'On Computable Numbers',
      subtitle: 'With an Application to the Entscheidungsproblem',
      description: 'The foundational 1936 monograph introducing the universal Turing machine, computational limits, and the mathematical genesis of digital computers.',
      isbn10: '0486438048',
      isbn13: '978-0486438047',
      publisher: 'Dover Publications',
      publication_year: 2004,
      publication_date: '2004-09-01',
      edition: 'Facsimile Archive',
      language: 'English',
      page_count: 144,
      format: 'Paperback',
      category_id: 'cat_compsci',
      authors: ['auth_turing'],
      shelf_number: 'RARE-02',
      section: 'Special Collections & Archives',
      floor: 3,
      rating: 4.9,
      rating_count: 720,
      featured: 0,
      popular_score: 82,
      copies: 2,
    },
    {
      id: 'bk_lovelace_sketch',
      title: 'Sketch of the Analytical Engine',
      subtitle: 'With Notes by the Translator',
      description: 'Ada Lovelace’s pioneering notes containing the first published algorithm intended for implementation on Charles Babbage’s mechanical computer.',
      isbn10: '1162983712',
      isbn13: '978-1162983714',
      publisher: 'Kessinger Publishing',
      publication_year: 2010,
      publication_date: '2010-09-10',
      edition: 'Historical Monograph',
      language: 'English',
      page_count: 98,
      format: 'Hardcover',
      category_id: 'cat_compsci',
      authors: ['auth_lovelace'],
      shelf_number: 'RARE-05',
      section: 'Special Collections & Archives',
      floor: 3,
      rating: 4.8,
      rating_count: 480,
      featured: 0,
      popular_score: 80,
      copies: 2,
    },
    {
      id: 'bk_qed',
      title: 'QED: The Strange Theory of Light and Matter',
      subtitle: 'Princeton Science Library',
      description: 'Feynman’s famous non-mathematical presentation of quantum electrodynamics to general audiences, explaining photons, electrons, and mirror reflection.',
      isbn10: '0691164096',
      isbn13: '978-0691164090',
      publisher: 'Princeton University Press',
      publication_year: 2014,
      publication_date: '2014-10-26',
      edition: 'Expanded Edition',
      language: 'English',
      page_count: 184,
      format: 'Paperback',
      category_id: 'cat_science',
      authors: ['auth_feynman'],
      shelf_number: 'PH-15',
      section: 'Natural Philosophy & Physics Wing',
      floor: 3,
      rating: 4.7,
      rating_count: 1620,
      featured: 0,
      popular_score: 85,
      copies: 3,
    },
    {
      id: 'bk_homo_deus',
      title: 'Homo Deus',
      subtitle: 'A Brief History of Tomorrow',
      description: 'An inquiry into the future of humanity, examining dataism, bioengineering, artificial intelligence, and the destiny of the human species.',
      isbn10: '0062464310',
      isbn13: '978-0062464316',
      publisher: 'Harper',
      publication_year: 2017,
      publication_date: '2017-02-21',
      edition: '1st Edition',
      language: 'English',
      page_count: 448,
      format: 'Hardcover',
      category_id: 'cat_history',
      authors: ['auth_harari'],
      shelf_number: 'HIS-23',
      section: 'World Civilizations Annex',
      floor: 2,
      rating: 4.5,
      rating_count: 3100,
      featured: 0,
      popular_score: 88,
      copies: 4,
    },
    {
      id: 'bk_dispossessed',
      title: 'The Dispossessed',
      subtitle: 'An Ambiguous Utopia',
      description: 'A brilliant exploration of political theory, physics, and human freedom contrasting the anarchist moon Anarres with the capitalist planet Urras.',
      isbn10: '006051275X',
      isbn13: '978-0060512750',
      publisher: 'Harper Voyager',
      publication_year: 2003,
      publication_date: '2003-04-01',
      edition: 'Hainish Cycle Standard',
      language: 'English',
      page_count: 400,
      format: 'Paperback',
      category_id: 'cat_fiction',
      authors: ['auth_leguin'],
      shelf_number: 'FIC-L06',
      section: 'Fiction Stacks',
      floor: 1,
      rating: 4.8,
      rating_count: 2200,
      featured: 0,
      popular_score: 87,
      copies: 3,
    },
    {
      id: 'bk_steve_jobs',
      title: 'Steve Jobs',
      subtitle: 'The Exclusive Biography',
      description: 'Based on more than forty interviews with Jobs conducted over two years, Isaacson delivers a candid portrait of a roller-coaster life and searingly intense personality.',
      isbn10: '1451648537',
      isbn13: '978-1451648539',
      publisher: 'Simon & Schuster',
      publication_year: 2011,
      publication_date: '2011-10-24',
      edition: '1st Edition',
      language: 'English',
      page_count: 656,
      format: 'Hardcover',
      category_id: 'cat_biography',
      authors: ['auth_isaacson'],
      shelf_number: 'BIO-04',
      section: 'Biographical Archive',
      floor: 2,
      rating: 4.6,
      rating_count: 7800,
      featured: 0,
      popular_score: 90,
      copies: 4,
    },
    {
      id: 'bk_pale_blue_dot',
      title: 'Pale Blue Dot',
      subtitle: 'A Vision of the Human Future in Space',
      description: 'Carl Sagan’s stirring sequel to Cosmos, exploring the significance of humanity’s planetary origins and our destiny among the stars.',
      isbn10: '0345376595',
      isbn13: '978-0345376596',
      publisher: 'Ballantine Books',
      publication_year: 1997,
      publication_date: '1997-09-08',
      edition: 'Illustrated Paperback',
      language: 'English',
      page_count: 384,
      format: 'Paperback',
      category_id: 'cat_science',
      authors: ['auth_sagan'],
      shelf_number: 'AST-08',
      section: 'Astronomy & Astrophysics Gallery',
      floor: 3,
      rating: 4.9,
      rating_count: 2800,
      featured: 0,
      popular_score: 92,
      copies: 3,
    },
    {
      id: 'bk_godel_escher_bach',
      title: 'Gödel, Escher, Bach: An Eternal Golden Braid',
      subtitle: 'A Metaphorical Fugue on Minds and Machines in the Spirit of Lewis Carroll',
      description: 'Douglas Hofstadter’s Pulitzer Prize-winning tour de force exploring formal systems, recursion, strange loops, consciousness, and artificial intelligence.',
      isbn10: '0465026567',
      isbn13: '978-0465026562',
      publisher: 'Basic Books',
      publication_year: 1999,
      publication_date: '1999-02-05',
      edition: '20th Anniversary Edition',
      language: 'English',
      page_count: 824,
      format: 'Paperback',
      category_id: 'cat_math',
      authors: ['auth_knuth'], // Associated relation
      shelf_number: 'MAT-09',
      section: 'Mathematics & Symbolic Logic Hall',
      floor: 2,
      rating: 4.8,
      rating_count: 3600,
      featured: 1,
      popular_score: 94,
      copies: 4,
    },
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (
      id, title, subtitle, description, isbn10, isbn13, publisher,
      publication_year, publication_date, edition, language, page_count, format,
      cover_image_url, category_id, shelf_number, section, floor, rating, rating_count,
      featured, popular_score
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertBookAuthor = db.prepare(`
    INSERT OR IGNORE INTO book_authors (book_id, author_id, is_primary)
    VALUES (?, ?, ?)
  `);

  const insertCopy = db.prepare(`
    INSERT INTO book_copies (
      id, book_id, accession_number, shelf_number, section, floor, status, condition
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalCopiesCreated = 0;

  for (const bk of books) {
    insertBook.run(
      bk.id,
      bk.title,
      bk.subtitle,
      bk.description,
      bk.isbn10,
      bk.isbn13,
      bk.publisher,
      bk.publication_year,
      bk.publication_date,
      bk.edition,
      bk.language,
      bk.page_count,
      bk.format,
      null, // cover_image_url fallback to dynamic canvas/CSS
      bk.category_id,
      bk.shelf_number,
      bk.section,
      bk.floor,
      bk.rating,
      bk.rating_count,
      bk.featured,
      bk.popular_score
    );

    // Book authors relation
    bk.authors.forEach((authId, idx) => {
      insertBookAuthor.run(bk.id, authId, idx === 0 ? 1 : 0);
    });

    // Create physical copies
    for (let c = 1; c <= bk.copies; c++) {
      const copyId = `cp_${bk.id}_${c}`;
      const accessionNumber = `ACC-${bk.id.replace('bk_', '').toUpperCase()}-0${c}`;
      
      // Let's create realistic variations in copy statuses
      let status = 'AVAILABLE';
      let condition = 'Good';

      if (c === 1 && (bk.id === 'bk_sicp' || bk.id === 'bk_atomic_habits' || bk.id === 'bk_sapiens')) {
        status = 'ISSUED';
        condition = 'Good';
      } else if (c === 2 && bk.id === 'bk_computable_numbers') {
        status = 'RESERVED';
        condition = 'Pristine';
      } else if (c === bk.copies && (bk.id === 'bk_taocp_v1' || bk.id === 'bk_feynman_lectures')) {
        status = 'MAINTENANCE';
        condition = 'Fair';
      } else if (c === 1) {
        condition = 'Pristine';
      }

      insertCopy.run(
        copyId,
        bk.id,
        accessionNumber,
        bk.shelf_number,
        bk.section,
        bk.floor,
        status,
        condition
      );
      totalCopiesCreated++;
    }
  }

  // 4. Users (Librarian, Faculty, Students)
  const users = [
    {
      id: 'usr_eleanor',
      name: 'Eleanor Vance',
      email: 'librarian@athenaeum.edu',
      password_hash: 'sha256_admin_pwd_mock',
      role: 'Librarian',
      membership_id: 'LIB-8801',
      profile_image: '',
    },
    {
      id: 'usr_julian',
      name: 'Dr. Julian Mercer',
      email: 'faculty@athenaeum.edu',
      password_hash: 'sha256_faculty_pwd_mock',
      role: 'Faculty',
      membership_id: 'FAC-4209',
      profile_image: '',
    },
    {
      id: 'usr_maya',
      name: 'Maya Lin',
      email: 'student@athenaeum.edu',
      password_hash: 'sha256_student_pwd_mock',
      role: 'Student',
      membership_id: 'STU-1049',
      profile_image: '',
    },
    {
      id: 'usr_arthur',
      name: 'Arthur Pendelton',
      email: 'arthur@athenaeum.edu',
      password_hash: 'sha256_student_pwd_mock',
      role: 'Student',
      membership_id: 'STU-2091',
      profile_image: '',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, membership_id, profile_image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.password_hash, u.role, u.membership_id, u.profile_image);
  }

  // 5. Active Borrowing & History
  const insertBorrowing = db.prepare(`
    INSERT INTO borrowing (
      id, user_id, book_copy_id, issued_at, due_date, returned_at, status, renewed_count, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Maya has borrowed SICP (Active, due in 6 days)
  const now = new Date();
  const sixDaysAhead = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twelveDaysAhead = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  insertBorrowing.run(
    'brw_001',
    'usr_maya',
    'cp_bk_sicp_1',
    eightDaysAgo,
    sixDaysAhead,
    null,
    'ACTIVE',
    0,
    'Course reserve for Advanced Systems'
  );

  // Maya also borrowed Sapiens (Active, due in 12 days)
  insertBorrowing.run(
    'brw_002',
    'usr_maya',
    'cp_bk_sapiens_1',
    twoDaysAgoFormatted(2),
    twelveDaysAhead,
    null,
    'ACTIVE',
    1,
    'Renewed once'
  );

  // Past returned borrowing for Maya
  insertBorrowing.run(
    'brw_003',
    'usr_maya',
    'cp_bk_cosmos_1',
    twentyDaysAgo,
    fourteenDaysAgo,
    fourteenDaysAgo,
    'RETURNED',
    0,
    'Returned in pristine condition'
  );

  // Julian Mercer borrowed Atomic Habits (Active)
  insertBorrowing.run(
    'brw_004',
    'usr_julian',
    'cp_bk_atomic_habits_1',
    threeDaysAgo,
    twelveDaysAhead,
    null,
    'ACTIVE',
    0,
    'Faculty research reference'
  );

  // 6. Reservations
  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, user_id, book_id, reserved_at, expiry_date, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReservation.run(
    'res_001',
    'usr_maya',
    'bk_computable_numbers',
    twoDaysAgoFormatted(1),
    twelveDaysAhead,
    'ACTIVE',
    1
  );

  // 7. Favorites
  const insertFavorite = db.prepare(`
    INSERT OR IGNORE INTO favorites (id, user_id, book_id)
    VALUES (?, ?, ?)
  `);
  insertFavorite.run('fav_001', 'usr_maya', 'bk_taocp_v1');
  insertFavorite.run('fav_002', 'usr_maya', 'bk_cosmos');
  insertFavorite.run('fav_003', 'usr_maya', 'bk_meditations');

  // 8. Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNotification.run(
    'notif_001',
    'usr_maya',
    'Reservation Ready for Pick-up',
    'Your requested copy of "On Computable Numbers" has been placed on hold at the Circulation Desk.',
    'reserve',
    0
  );
  insertNotification.run(
    'notif_002',
    'usr_maya',
    'Loan Renewal Confirmed',
    'You successfully renewed "Sapiens: A Brief History of Humankind". New due date is in 12 days.',
    'due_soon',
    1
  );

  console.log(`Database initialized successfully with ${books.length} books, ${totalCopiesCreated} physical copies, and ${users.length} users.`);
}

function twoDaysAgoFormatted(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}
