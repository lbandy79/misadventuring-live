/**
 * AuthProvider — wraps the platform with Firebase Auth state.
 *
 * Phase 8: lightweight auth foundation. Uses Google sign-in (lowest
 * setup friction — no email infrastructure or password UI needed).
 *
 * Admin role: there are NO Firebase custom claims (those need a backend
 * we don't have). Instead, an audience member is treated as admin if
 * their email appears in `config/admins.emails` (a string array). The
 * Firestore security rules check the same doc, so the client can't
 * fake admin status.
 *
 * Anonymous browsing remains the default — `useAuth()` returns
 * `{ user: null }` until the audience signs in. Pages that don't need
 * auth (landing, reserve, /shows, companion code-as-auth) keep working.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export interface AuthContextValue {
  /** Firebase Auth user, or null when signed out. */
  user: User | null;
  /** True while the initial onAuthStateChanged callback is pending. */
  isLoading: boolean;
  /** True if the signed-in user's email is on the admin allowlist. */
  isAdmin: boolean;
  /** True while the admin allowlist doc subscription is initializing. */
  isAdminLoading: boolean;
  /** Open the Google sign-in popup. */
  signIn: () => Promise<void>;
  /** Sign out the current user. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AdminsDoc {
  emails?: string[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'admins'),
      (snap) => {
        const data = snap.data() as AdminsDoc | undefined;
        setAdminEmails(
          Array.isArray(data?.emails)
            ? data!.emails!.map((e) => e.toLowerCase())
            : [],
        );
        setIsAdminLoading(false);
      },
      (err) => {
        console.warn('config/admins read failed (treating as no admins):', err);
        setAdminEmails([]);
        setIsAdminLoading(false);
      },
    );
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin =
      !!user?.email && adminEmails.includes(user.email.toLowerCase());
    return {
      user,
      isLoading,
      isAdmin,
      isAdminLoading,
      signIn: async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      signOut: async () => {
        await signOut(auth);
      },
    };
  }, [user, isLoading, adminEmails, isAdminLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>');
  }
  return ctx;
}
