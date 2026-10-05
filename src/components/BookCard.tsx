import React from 'react';
import { Star, Heart, Bookmark, ArrowRight, CheckCircle2, AlertCircle, Clock, BookOpen } from 'lucide-react';
import { Book } from '../types.ts';
import { BookCover } from './BookCover.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onRead?: (bookId: string) => void;
  onFavoriteChange?: (bookId: string, isFav: boolean) => void;
  layout?: 'grid' | 'list';
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onRead,
  onFavoriteChange,
  layout = 'grid',
}) => {
  const { currentUser, showToast } = useAuth();
  const [isFav, setIsFav] = React.useState<boolean>(Boolean(book.is_favorite));
  const [toggling, setToggling] = React.useState<boolean>(false);

  const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
  const availableCopies = book.available_copies ?? 0;
  const totalCopies = book.total_copies ?? 0;

  // Availability styling and descriptive text
  let statusBadge = {
    text: `${availableCopies} of ${totalCopies} copies available`,
    icon: CheckCircle2,
    color: 'text-emerald-700',
    dot: 'bg-emerald-600',
  };

  if (availableCopies === 0) {
    statusBadge = {
      text: 'Currently Issued (Hold available)',
      icon: Clock,
      color: 'text-amber-800',
      dot: 'bg-amber-600',
    };
  } else if (availableCopies === 1 && totalCopies > 1) {
    statusBadge = {
      text: 'Only 1 copy remaining',
      icon: AlertCircle,
      color: 'text-orange-700',
      dot: 'bg-orange-500',
    };
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast('Please sign in to save books to your library', 'info');
      return;
    }
    setToggling(true);
    try {
      const res = await api.toggleFavorite(currentUser.id, book.id);
      setIsFav(res.favorited);
      if (onFavoriteChange) {
        onFavoriteChange(book.id, res.favorited);
      }
      showToast(res.message, 'success');
    } catch {
      showToast('Failed to update favorite', 'error');
    } finally {
      setToggling(false);
    }
  };

  if (layout === 'list') {
    return (
      <article
        onClick={() => onSelect(book)}
        className="group relative bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row gap-5 cursor-pointer hover:border-amber-900/30"
      >
        <div className="shrink-0 flex justify-center sm:block">
          <BookCover
            title={book.title}
            authorName={authorName}
            categorySlug={book.category_slug}
            coverImageUrl={book.cover_image_url}
            size="md"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Unboxed metadata line with typographic separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 mb-1.5">
              <span>{book.category_name || 'Literature'}</span>
              <span aria-hidden="true">·</span>
              <span>{book.publication_year}</span>
              <span aria-hidden="true">·</span>
              <span>{book.format}</span>
              {book.shelf_number && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-stone-600">Shelf {book.shelf_number}</span>
                </>
              )}
            </div>

            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-stone-900 group-hover:text-[#8B3A2B] transition-colors leading-snug">
                {book.title}
              </h3>

              <button
                onClick={handleToggleFavorite}
                disabled={toggling}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-red-600 transition-colors focus:outline-none shrink-0"
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                aria-label="Toggle favorite"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFav ? 'fill-red-600 text-red-600' : 'text-stone-400'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-stone-600 font-medium mt-0.5">{authorName}</p>

            <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
              {book.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-stone-100">
            {/* Availability with icon and color-blind friendly text */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
              <span className={statusBadge.color}>{statusBadge.text}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-stone-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="font-medium text-stone-700">{book.rating.toFixed(1)}</span>
                <span className="text-[11px] text-stone-600 font-mono">({book.rating_count})</span>
              </div>

              {onRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(book.id);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200/90 border border-amber-300/60 transition-colors flex items-center gap-1"
                  title="Read online in digital reader"
                >
                  <BookOpen className="w-3 h-3 text-[#8B3A2B]" />
                  <span>Read</span>
                </button>
              )}

              <span className="text-xs font-medium text-[#8B3A2B] group-hover:underline flex items-center gap-1">
                View Details
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Grid layout card
  return (
    <article
      onClick={() => onSelect(book)}
      className="group relative bg-white border border-stone-200/90 rounded-xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:border-amber-900/30"
    >
      <div>
        {/* Cover Presentation */}
        <div className="relative flex justify-center mb-3.5 pt-1">
          <BookCover
            title={book.title}
            authorName={authorName}
            categorySlug={book.category_slug}
            coverImageUrl={book.cover_image_url}
            size="md"
          />

          {/* Favorite button */}
          <button
            onClick={handleToggleFavorite}
            disabled={toggling}
            className="absolute top-0 right-0 p-1.5 rounded-full bg-white/80 backdrop-blur-xs hover:bg-white text-stone-400 hover:text-red-600 shadow-xs border border-stone-200/60 transition-colors focus:outline-none"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle favorite"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isFav ? 'fill-red-600 text-red-600' : 'text-stone-400'
              }`}
            />
          </button>
        </div>

        {/* Unboxed metadata: category and rating */}
        <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
          <span className="truncate max-w-[130px] font-medium">{book.category_name || 'General'}</span>
          <div className="flex items-center gap-1 text-[11px] text-stone-700 shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span className="font-semibold">{book.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Book Title */}
        <h3 className="font-serif text-base font-semibold text-stone-900 line-clamp-1 group-hover:text-[#8B3A2B] transition-colors">
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-stone-600 font-medium truncate mt-0.5">{authorName}</p>

        {/* Small description */}
        <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
          {book.description}
        </p>
      </div>

      {/* Footer Availability & Action */}
      <div className="pt-3 mt-3 border-t border-stone-100 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBadge.dot}`} />
          <span className={`truncate ${statusBadge.color}`}>{statusBadge.text}</span>
        </div>

        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(book);
            }}
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors flex items-center justify-center gap-1"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {onRead && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRead(book.id);
              }}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200/90 border border-amber-300/80 transition-colors flex items-center justify-center gap-1 shrink-0"
              title="Read online in digital reader"
            >
              <BookOpen className="w-3 h-3 text-[#8B3A2B]" />
              <span>Read</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
