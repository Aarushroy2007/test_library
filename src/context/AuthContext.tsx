import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem } from '../types.ts';
import { api } from '../services/api.ts';

// Pre-seeded demo personas for easy evaluation & switching
export const DEMO_USERS: User[] = [
  {
    id: 'usr_maya',
    name: 'Maya Lin',
    email: 'student@athenaeum.edu',
    role: 'Student',
    membership_id: 'STU-1049',
  },
  {
    id: 'usr_eleanor',
    name: 'Eleanor Vance',
    email: 'librarian@athenaeum.edu',
    role: 'Librarian',
    membership_id: 'LIB-8801',
  },
  {
    id: 'usr_julian',
    name: 'Dr. Julian Mercer',
    email: 'faculty@athenaeum.edu',
    role: 'Faculty',
    membership_id: 'FAC-4209',
  },
  {
    id: 'usr_arthur',
    name: 'Arthur Pendelton',
    email: 'arthur@athenaeum.edu',
    role: 'Student',
    membership_id: 'STU-2091',
  },
];

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  switchDemoUser: (userId: string) => void;
  demoUsers: User[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  isLibrarianOrAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('athenaeum_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEMO_USERS[0]; // Default to Maya Lin (Student)
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('athenaeum_user', JSON.stringify(currentUser));
      refreshNotifications();
    } else {
      localStorage.removeItem('athenaeum_user');
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.id]);

  const refreshNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications(currentUser.id);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // quiet fail
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await api.markAllNotificationsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const switchDemoUser = (userId: string) => {
    const target = DEMO_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      showToast(`Switched active user to ${target.name} (${target.role})`, 'info');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const isLibrarianOrAdmin = currentUser?.role === 'Librarian' || currentUser?.role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchDemoUser,
        demoUsers: DEMO_USERS,
        notifications,
        unreadNotificationCount: unreadCount,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        showToast,
        removeToast,
        isLibrarianOrAdmin,
      }}
    >
      {children}
      {/* Toast notifications container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg shadow-lg border text-sm transition-all duration-200 ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : toast.type === 'info'
                ? 'bg-stone-900 text-stone-100 border-stone-800'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
