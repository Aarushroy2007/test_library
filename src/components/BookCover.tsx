import React from 'react';
import { Book as BookIcon } from 'lucide-react';

interface BookCoverProps {
  title: string;
  authorName?: string;
  categorySlug?: string;
  categoryColor?: string;
  coverImageUrl?: string;
  className?: string;
  aspectRatio?: 'book' | 'compact' | 'square';
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

const PALETTES: Record<string, { bg: string; spine: string; text: string; subtext: string; pattern: string }> = {
  fiction: {
    bg: 'from-[#4A1513] to-[#2B0B0A]',
    spine: '#380E0D',
    text: '#F5E6D3',
    subtext: '#C4A882',
    pattern: 'radial-gradient(ellipse at 50% 50%, rgba(214, 180, 140, 0.08) 0%, transparent 80%)',
  },
  'computer-science': {
    bg: 'from-[#0F2847] to-[#081526]',
    spine: '#0A1C33',
    text: '#E0E7FF',
    subtext: '#93C5FD',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(147, 197, 253, 0.08) 0%, transparent 70%)',
  },
  science: {
    bg: 'from-[#0C3322] to-[#061C12]',
    spine: '#082418',
    text: '#E6F4EA',
    subtext: '#A3D9B5',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(163, 217, 181, 0.08) 0%, transparent 75%)',
  },
  philosophy: {
    bg: 'from-[#3B2514] to-[#1E120A]',
    spine: '#2C1B0E',
    text: '#FDE68A',
    subtext: '#D97706',
    pattern: 'radial-gradient(ellipse at 50% 20%, rgba(251, 191, 36, 0.07) 0%, transparent 70%)',
  },
  history: {
    bg: 'from-[#2E1A47] to-[#170C24]',
    spine: '#231336',
    text: '#F3E8FF',
    subtext: '#C084FC',
    pattern: 'radial-gradient(circle at 60% 60%, rgba(192, 132, 252, 0.08) 0%, transparent 75%)',
  },
  mathematics: {
    bg: 'from-[#0B3A36] to-[#05211E]',
    spine: '#082B28',
    text: '#CCFBF1',
    subtext: '#5EEAD4',
    pattern: 'radial-gradient(circle at 40% 40%, rgba(94, 234, 212, 0.08) 0%, transparent 70%)',
  },
  biography: {
    bg: 'from-[#451A03] to-[#250E02]',
    spine: '#331302',
    text: '#FEF3C7',
    subtext: '#FCD34D',
    pattern: 'radial-gradient(ellipse at 50% 80%, rgba(252, 211, 77, 0.08) 0%, transparent 70%)',
  },
  psychology: {
    bg: 'from-[#4C1D95] to-[#2E1065]',
    spine: '#3B1574',
    text: '#FDF4FF',
    subtext: '#E879F9',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(232, 121, 249, 0.08) 0%, transparent 70%)',
  },
};

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  authorName,
  categorySlug = 'fiction',
  coverImageUrl,
  className = '',
  size = 'md',
}) => {
  const palette = PALETTES[categorySlug] || PALETTES.fiction;

  const sizeClasses = {
    sm: 'w-20 h-28 text-[9px]',
    md: 'w-32 h-44 sm:w-36 sm:h-52 text-xs',
    lg: 'w-44 h-64 sm:w-52 sm:h-76 text-sm',
    hero: 'w-56 h-80 sm:w-64 sm:h-92 text-base',
  }[size];

  // If valid external image is provided, display with fallback
  if (coverImageUrl) {
    return (
      <div className={`relative overflow-hidden rounded-md shadow-md bg-stone-100 ${sizeClasses} ${className}`}>
        <img
          src={coverImageUrl}
          alt={`Cover of ${title}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // hide failed img and show fallback
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative select-none overflow-hidden rounded-r-md rounded-l-sm shadow-md transition-all duration-300 group-hover:shadow-xl bg-gradient-to-br ${palette.bg} flex flex-col justify-between p-3.5 border-l-4 border-stone-800/40 ${sizeClasses} ${className}`}
      style={{
        boxShadow: 'inset 4px 0 8px rgba(0, 0, 0, 0.45), 2px 4px 12px rgba(28, 25, 23, 0.15)',
      }}
    >
      {/* Background paper texture & grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{ backgroundImage: palette.pattern }}
      />

      {/* Book spine lighting crease */}
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />

      {/* Outer border foil stamping */}
      <div className="absolute inset-1.5 border border-amber-200/20 rounded pointer-events-none" />

      {/* Header ornament */}
      <div className="relative z-10 flex items-center justify-between opacity-75">
        <span className="text-[9px] uppercase tracking-widest text-amber-200/80 font-sans font-medium truncate">
          Athenaeum
        </span>
        <BookIcon className="w-3 h-3 text-amber-200/60 shrink-0" />
      </div>

      {/* Title & Author */}
      <div className="relative z-10 my-auto text-center px-1">
        <h4
          className="font-serif font-semibold leading-tight line-clamp-3 mb-1.5 tracking-tight"
          style={{ color: palette.text }}
        >
          {title}
        </h4>
        {authorName && (
          <p
            className="text-[10px] tracking-wider uppercase font-sans line-clamp-1 opacity-80"
            style={{ color: palette.subtext }}
          >
            {authorName}
          </p>
        )}
      </div>

      {/* Footer seal */}
      <div className="relative z-10 flex items-center justify-center opacity-50 pt-1 border-t border-amber-200/15">
        <span className="text-[8px] tracking-widest uppercase font-serif text-amber-100/70">
          Archive Edition
        </span>
      </div>
    </div>
  );
};
