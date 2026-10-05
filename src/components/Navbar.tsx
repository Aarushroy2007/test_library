import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  User as UserIcon,
  Menu,
  X,
  BookOpen,
  BookmarkCheck,
  Shield,
  Layers,
  Users as UsersIcon,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, onOpenSearch }) => {
  const {
    currentUser,
    switchDemoUser,
    demoUsers,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isLibrarianOrAdmin,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'catalog', label: 'Books' },
    { id: 'reader', label: 'Reading Room' },
    { id: 'categories', label: 'Categories' },
    { id: 'authors', label: 'Authors' },
    { id: 'my-library', label: 'My Library' },
    ...(isLibrarianOrAdmin ? [{ id: 'admin', label: 'Librarian Desk' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark (Single text element wordmark) */}
        <button
          onClick={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-3 text-left focus:outline-none"
        >
          <div className="w-9 h-9 rounded-md bg-[#8B3A2B] text-amber-100 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
            <BookOpen className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 block leading-tight">
              ATHENAEUM
            </span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 block font-sans font-medium">
              Digital Library System
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (Clean text links with hover styling) */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentView(link.id)}
                className={`text-sm font-medium transition-colors relative py-1 focus:outline-none ${
                  isActive
                    ? 'text-[#8B3A2B] font-semibold'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B3A2B] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Search trigger, Notification tray, User persona menu) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200 rounded-lg transition-colors focus:outline-none"
            title="Search library catalog"
            aria-label="Search catalog"
          >
            <Search className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Search catalog...</span>
          </button>

          {/* Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors focus:outline-none"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#8B3A2B] ring-2 ring-[#FDFBF7]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-stone-900">Notifications</h4>
                    {unreadNotificationCount > 0 && (
                      <span className="text-xs text-[#8B3A2B] font-medium">
                        ({unreadNotificationCount} new)
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 py-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-600">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-2.5 text-xs rounded-lg transition-colors cursor-pointer hover:bg-stone-50 ${
                          !n.is_read ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-stone-900">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B3A2B] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-stone-500 mt-1 block">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Persona Switcher / Profile */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-stone-200/90 bg-white hover:bg-stone-50 transition-colors focus:outline-none"
              title="Active Persona & Account"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ${
                  currentUser?.role === 'Librarian'
                    ? 'bg-[#8B3A2B]'
                    : currentUser?.role === 'Faculty'
                    ? 'bg-emerald-800'
                    : 'bg-stone-700'
                }`}
              >
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <span className="font-medium text-stone-900 block truncate max-w-[100px]">
                  {currentUser?.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-stone-600 block leading-none">
                  {currentUser?.role}
                </span>
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="pb-3 border-b border-stone-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-900">{currentUser?.name}</p>
                    <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                      {currentUser?.role}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">{currentUser?.email}</p>
                  <p className="text-[11px] text-stone-600 mt-0.5 font-mono">
                    ID: {currentUser?.membership_id}
                  </p>
                </div>

                {/* Persona Switcher Quick Selection */}
                <div className="py-2.5">
                  <p className="text-[11px] uppercase tracking-wider text-stone-600 font-semibold mb-2">
                    Switch Test Persona
                  </p>
                  <div className="space-y-1">
                    {demoUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchDemoUser(u.id);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isCurrent
                              ? 'bg-amber-50 text-[#8B3A2B] font-semibold'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[10px] font-bold">
                              {u.name.charAt(0)}
                            </span>
                            <div>
                              <span>{u.name}</span>
                              <span className="text-[10px] text-stone-600 ml-1.5 font-normal">
                                ({u.role})
                              </span>
                            </div>
                          </div>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#8B3A2B]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setCurrentView('my-library');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-2"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-stone-500" />
                    <span>View My Library Loans</span>
                  </button>

                  {isLibrarianOrAdmin && (
                    <button
                      onClick={() => {
                        setCurrentView('admin');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#8B3A2B] font-medium hover:bg-amber-50 transition-colors flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#8B3A2B]" />
                      <span>Librarian Management Desk</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FDFBF7] px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setCurrentView(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === link.id
                  ? 'bg-amber-50 text-[#8B3A2B] font-semibold'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
