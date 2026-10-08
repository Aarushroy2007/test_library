import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

let fallbackDb: DatabaseSync | null = null;
function getDb(targetDb?: DatabaseSync): DatabaseSync {
  if (targetDb) return targetDb;
  if (!fallbackDb) {
    const dataDir = path.resolve(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'library.db');
    fallbackDb = new DatabaseSync(dbPath);
    try {
      fallbackDb.exec('PRAGMA foreign_keys = ON;');
    } catch {}
  }
  return fallbackDb;
}

// Helper to sanitize title
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^([a-z])/, (_, c) => c.toUpperCase());
}

// Categorize book by title keywords
function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('quantum') || t.includes('physics') || t.includes('optics') || t.includes('laser') || t.includes('photon') || t.includes('electromagnet') || t.includes('astronomy') || t.includes('gravity') || t.includes('fluid mechanics')) {
    return 'cat_science';
  }
  if (t.includes('machine learning') || t.includes('deep learning') || t.includes('artificial intelligence') || t.includes('python') || t.includes('data science') || t.includes('data structure') || t.includes('algorithm') || t.includes('nlp') || t.includes('natural language') || t.includes('iot') || t.includes('internet of things') || t.includes('cyber') || t.includes('robot') || t.includes('computer') || t.includes('network') || t.includes('cloud') || t.includes('software')) {
    return 'cat_compsci';
  }
  if (t.includes('math') || t.includes('linear algebra') || t.includes('statistical') || t.includes('probability') || t.includes('graph theory') || t.includes('algebra') || t.includes('combinator')) {
    return 'cat_math';
  }
  if (t.includes('physiology') || t.includes('anatomy') || t.includes('biochemistry') || t.includes('neuroscience') || t.includes('medical') || t.includes('cancer') || t.includes('brain') || t.includes('biomedical') || t.includes('pain medicine') || t.includes('mri')) {
    return 'cat_biomedical';
  }
  if (t.includes('chemical') || t.includes('polymer') || t.includes('nanomaterial') || t.includes('textile') || t.includes('petroleum') || t.includes('power') || t.includes('electrical') || t.includes('engineering') || t.includes('nanotechnology') || t.includes('refractory') || t.includes('iron') || t.includes('steel')) {
    return 'cat_engineering';
  }
  if (t.includes('sport') || t.includes('exercise') || t.includes('football')) {
    return 'cat_sports';
  }
  return 'cat_engineering';
}

export interface CUBookEntry {
  accNo: string;
  accDate: string;
  title: string;
  author: string;
  publisher: string;
}

export function importEntries(entries: CUBookEntry[], activeDb?: DatabaseSync) {
  const db = getDb(activeDb);
  console.log(`Processing ${entries.length} accessions records...`);

  // Ensure categories exist
  const ensureCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, slug, description, icon, accent_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  ensureCategory.run('cat_engineering', 'Technology & Engineering', 'engineering', 'Chemical, electrical, materials, power systems, and textile engineering.', 'Cpu', '#1E3A8A');
  ensureCategory.run('cat_biomedical', 'Biomedical & Health Sciences', 'biomedical', 'Physiology, anatomy, biochemistry, neuroscience, and medical diagnostics.', 'Atom', '#0F766E');
  ensureCategory.run('cat_sports', 'Sports & Exercise Sciences', 'sports-science', 'Sports analytics, physiology of exercise, training expertise, and coaching methodology.', 'Activity', '#B45309');

  const insertAuthor = db.prepare(`
    INSERT OR IGNORE INTO authors (id, name, biography)
    VALUES (?, ?, ?)
  `);

  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO books (
      id, title, subtitle, description, isbn10, isbn13, publisher,
      publication_year, publication_date, edition, language, page_count, format,
      category_id, shelf_number, section, floor, rating, rating_count, featured, popular_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'English', ?, 'Hardcover', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookAuthor = db.prepare(`
    INSERT OR IGNORE INTO book_authors (book_id, author_id, is_primary)
    VALUES (?, ?, 1)
  `);

  const insertCopy = db.prepare(`
    INSERT OR REPLACE INTO book_copies (
      id, book_id, accession_number, shelf_number, section, floor, status, condition, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Group copies by normalized title
  const titleGroups = new Map<string, CUBookEntry[]>();
  for (const e of entries) {
    const norm = cleanTitle(e.title).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!titleGroups.has(norm)) {
      titleGroups.set(norm, []);
    }
    titleGroups.get(norm)!.push(e);
  }

  let booksAdded = 0;
  let copiesAdded = 0;

  for (const [normKey, copyList] of titleGroups.entries()) {
    const first = copyList[0];
    const cleanT = cleanTitle(first.title);
    const authorRaw = first.author?.trim() || 'Faculty of Engineering & Tech';
    const authorName = authorRaw
      .replace(/\s+/g, ' ')
      .trim();

    const authId = 'auth_cu_' + authorName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    insertAuthor.run(authId, authorName, `Scholar and author of ${cleanT}, acquired by Technology and Engineering Libraries of CU.`);

    const bookId = 'bk_cu_' + normKey.slice(0, 35);
    const categoryId = detectCategory(cleanT);
    const publisher = first.publisher ? first.publisher.replace(/\/.*$/, '').trim() : 'Academic Press';

    // Parse accession year (from DD/MM/YYYY)
    let year = 2025;
    const parts = first.accDate?.split('/');
    if (parts && parts.length === 3) {
      year = parseInt(parts[2], 10) || 2025;
    }

    const isbnFake = `978-CU-${first.accNo.replace(/[^0-9]/g, '').padStart(6, '0')}`;
    const shelfNum = `TE-${categoryId.replace('cat_', '').slice(0, 3).toUpperCase()}-${(booksAdded % 40 + 1).toString().padStart(2, '0')}`;
    const floorNum = categoryId === 'cat_compsci' ? 2 : categoryId === 'cat_science' ? 3 : 1;
    const sectionName = categoryId === 'cat_biomedical'
      ? 'Biomedical & Health Archives'
      : categoryId === 'cat_compsci'
      ? 'Computing & AI Hall'
      : categoryId === 'cat_sports'
      ? 'Exercise & Kinesiology Wing'
      : 'Engineering & Technology Stacks';

    const desc = `${cleanT} by ${authorName}. Acquired for Technology and Engineering Libraries of Calcutta University (F.Y. Collections). Comprehensive institutional reference text for research and coursework.`;

    insertBook.run(
      bookId,
      cleanT,
      null,
      desc,
      null,
      isbnFake,
      publisher,
      year,
      parts && parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '2025-01-01',
      'Library Edition',
      350 + (booksAdded % 20) * 15,
      categoryId,
      shelfNum,
      sectionName,
      floorNum,
      4.6 + ((booksAdded % 4) * 0.1),
      15 + (booksAdded % 40),
      booksAdded < 5 ? 1 : 0,
      80 + (booksAdded % 18)
    );
    insertBookAuthor.run(bookId, authId);
    booksAdded++;

    // Add physical copies with their real CU accession numbers!
    copyList.forEach((cEntry, idx) => {
      const copyId = `cp_${cEntry.accNo.trim()}`;
      // Randomly make 1 out of 5 issued or available
      const status = idx === 0 && copyList.length > 2 ? 'ISSUED' : 'AVAILABLE';
      const condition = idx === 0 ? 'Pristine' : 'Good';
      insertCopy.run(
        copyId,
        bookId,
        cEntry.accNo.trim(),
        shelfNum,
        sectionName,
        floorNum,
        status,
        condition,
        cEntry.accDate
      );
      copiesAdded++;
    });
  }

  console.log(`Successfully imported ${booksAdded} distinct titles with ${copiesAdded} physical accession copies!`);
}
