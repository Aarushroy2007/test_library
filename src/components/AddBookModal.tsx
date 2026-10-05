import React, { useState, useEffect } from 'react';
import { X, Plus, BookPlus, AlertCircle } from 'lucide-react';
import { Category, Author } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookCreated: () => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onBookCreated }) => {
  const { showToast } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isbn13, setIsbn13] = useState('');
  const [isbn10, setIsbn10] = useState('');
  const [publisher, setPublisher] = useState('Athenaeum University Press');
  const [publicationYear, setPublicationYear] = useState(new Date().getFullYear().toString());
  const [edition, setEdition] = useState('1st Edition');
  const [language, setLanguage] = useState('English');
  const [pageCount, setPageCount] = useState('320');
  const [format, setFormat] = useState('Hardcover');
  const [shelfNumber, setShelfNumber] = useState('GEN-01');
  const [section, setSection] = useState('Main Reading Hall');
  const [floor, setFloor] = useState('1');
  const [copyCount, setCopyCount] = useState('3');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      const [cats, auths] = await Promise.all([api.getCategories(), api.getAuthors()]);
      setCategories(cats);
      setAuthors(auths);
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      if (auths.length > 0 && !authorId) setAuthorId(auths[0].id);
    } catch {
      // quiet fail
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Book title is required.');
      return;
    }
    if (!isbn13.trim()) {
      setError('ISBN-13 is required.');
      return;
    }
    if (!description.trim()) {
      setError('Book description or synopsis is required.');
      return;
    }
    if (!authorId && !newAuthorName.trim()) {
      setError('Please select an existing author or enter a new author name.');
      return;
    }

    const copies = parseInt(copyCount, 10);
    if (isNaN(copies) || copies < 1 || copies > 20) {
      setError('Number of physical copies must be between 1 and 20.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim(),
        isbn10: isbn10.trim() || undefined,
        isbn13: isbn13.trim(),
        publisher: publisher.trim() || undefined,
        publication_year: parseInt(publicationYear, 10) || new Date().getFullYear(),
        edition,
        language,
        page_count: parseInt(pageCount, 10) || 300,
        format,
        category_id: categoryId,
        author_ids: authorId ? [authorId] : [],
        new_author_name: newAuthorName.trim() || undefined,
        shelf_number: shelfNumber.trim() || 'A-01',
        section: section.trim() || 'General Collection',
        floor: parseInt(floor, 10) || 1,
        copy_count: copies,
      };

      const res = await api.createBook(payload);
      showToast(res.message, 'success');
      onBookCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add book to library catalog.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-stone-200">
          <div className="w-9 h-9 rounded-lg bg-[#8B3A2B] text-amber-100 flex items-center justify-center">
            <BookPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Add New Catalog Acquisition
            </h2>
            <p className="text-xs text-stone-500">
              Accession a new title into the permanent database and automatically generate physical shelf barcodes.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Gödel, Escher, Bach"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. An Eternal Golden Braid"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>
          </div>

          {/* Author Selection or New Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Primary Author
              </label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              >
                <option value="">Select Existing Author...</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Or New Author Name
              </label>
              <input
                type="text"
                value={newAuthorName}
                onChange={(e) => {
                  setNewAuthorName(e.target.value);
                  if (e.target.value) setAuthorId('');
                }}
                placeholder="Enter author full name"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>
          </div>

          {/* Category & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Discipline / Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Physical Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              >
                <option value="Hardcover">Hardcover</option>
                <option value="Paperback">Paperback</option>
                <option value="Special Edition">Special Edition</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Physical Copies to Mint *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={copyCount}
                onChange={(e) => setCopyCount(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40 font-mono"
              />
            </div>
          </div>

          {/* ISBN-13, ISBN-10, Publisher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                ISBN-13 *
              </label>
              <input
                type="text"
                required
                value={isbn13}
                onChange={(e) => setIsbn13(e.target.value)}
                placeholder="e.g. 978-0465026562"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                ISBN-10
              </label>
              <input
                type="text"
                value={isbn10}
                onChange={(e) => setIsbn10(e.target.value)}
                placeholder="e.g. 0465026567"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Publisher
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Publisher Name"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>
          </div>

          {/* Year, Pages, Edition */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Publication Year
              </label>
              <input
                type="number"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Page Count
              </label>
              <input
                type="number"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Edition
              </label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="e.g. 2nd Revised Edition"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Shelf Barcode/Number
              </label>
              <input
                type="text"
                value={shelfNumber}
                onChange={(e) => setShelfNumber(e.target.value)}
                placeholder="e.g. CS-14"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Section Name
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Systems & Computing Hall"
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Floor Level
              </label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40"
              >
                <option value="1">Level 1 (Ground & Fiction)</option>
                <option value="2">Level 2 (Computing & Philosophy)</option>
                <option value="3">Level 3 (Science & Rare Archives)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">
              Synopsis / Bibliographic Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive academic synopsis of the text..."
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:border-amber-900/40 leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#8B3A2B] hover:bg-[#732F23] disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Accessioning...' : 'Add Book & Generate Barcodes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
