import React from 'react';
import { X, BookOpen, Clock, ShieldCheck, MapPin, Award } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-stone-900 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B3A2B] text-amber-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                About Athenaeum Digital Library
              </h2>
              <p className="text-[11px] text-stone-500">
                Institutional Archival & Circulation System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs sm:text-sm text-stone-600 space-y-3 leading-relaxed">
          <p>
            The Athenaeum Digital Library is a production-grade academic repository connecting students,
            researchers, and librarians with physical catalog assets, real-time stack coordinates, and
            dynamic loan availability.
          </p>

          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-stone-200/80 space-y-2 text-xs">
            <h4 className="font-semibold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8B3A2B]" />
              <span>Circulation & Lending Policy</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>Standard loan period: <strong>14 days</strong> per checkout.</li>
              <li>Renewals: Up to <strong>2 consecutive extensions</strong> (if no patron holds are pending).</li>
              <li>Hold reservations: Held for <strong>7 days</strong> at the circulation desk upon return.</li>
              <li>Copy condition classification: Pristine, Good, Fair, Worn, Maintenance.</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-stone-100 bg-stone-50">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900 mb-1">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Reading Rooms</span>
              </div>
              <p className="text-stone-500 text-[11px]">
                Mon–Fri: 08:00 – 22:00<br />
                Sat–Sun: 10:00 – 18:00
              </p>
            </div>

            <div className="p-3 rounded-lg border border-stone-100 bg-stone-50">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900 mb-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" />
                <span>Location</span>
              </div>
              <p className="text-stone-500 text-[11px]">
                Main Quadrangle Pavilion<br />
                Central Archives Wing
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
