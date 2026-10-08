import React, { useState, useEffect } from 'react';
import { BookOpen, Cpu, Atom, Compass, Landmark, Sigma, UserCheck, Brain, ArrowRight, BookMarked, Activity } from 'lucide-react';
import { Category } from '../types.ts';
import { api } from '../services/api.ts';

interface CategoriesViewProps {
  onSelectCategory: (categorySlug: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Cpu,
  Atom,
  Compass,
  Landmark,
  Sigma,
  UserCheck,
  Brain,
  Activity,
};

export const CategoriesView: React.FC<CategoriesViewProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-6">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#8B3A2B] block mb-1">
          Catalog Taxonomy
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Disciplines & Collections
        </h1>
        <p className="text-sm text-stone-600 mt-1 max-w-2xl">
          Browse books by intellectual discipline. Every category is indexed directly in the database
          with real-time volume counts and copy availability.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || BookOpen;
            const bookCount = cat.book_count ?? 0;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className="group relative bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between hover:border-amber-900/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: cat.accent_color || '#8B3A2B' }}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>

                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                      {bookCount} {bookCount === 1 ? 'title' : 'titles'}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-[#8B3A2B] transition-colors">
                    {cat.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                    {cat.description || 'Explore curated texts and primary references.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-500">
                  <span className="text-stone-400">Database indexed</span>
                  <span className="text-[#8B3A2B] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Explore collection <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
