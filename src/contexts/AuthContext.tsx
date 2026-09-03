import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfiguredClient } from '../firebase/config.js';
import { AppUser, AuthContextType } from '../types.js';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isFirebaseLive = isFirebaseConfiguredClient() && auth !== null;

  useEffect(() => {
    if (isFirebaseLive && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified,
              isSimulated: false,
            });
            setIdToken(token);
          } catch (tokenErr) {
            console.error('Error fetching ID token:', tokenErr);
            setUser(null);
            setIdToken(null);
          }
        } else {
          setUser(null);
          setIdToken(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const savedUser = localStorage.getItem('pgj_google_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed.user);
          setIdToken(parsed.token);
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }
  }, [isFirebaseLive]);

  /**
   * Primary Authentication: Google Sign-In provider with Firebase Authentication.
   */
  const signInWithGoogle = async () => {
    setError(null);
    if (isFirebaseLive && auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await signInWithPopup(auth, provider);

        if (credential.user) {
          const token = await credential.user.getIdToken();
          const appUser: AppUser = {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName,
            photoURL: credential.user.photoURL,
            emailVerified: credential.user.emailVerified,
            isSimulated: false,
          };
          setUser(appUser);
          setIdToken(token);

          // Update user profile in Firestore under users/{userId}
          if (db) {
            try {
              await setDoc(
                doc(db, 'users', credential.user.uid),
                {
                  displayName: credential.user.displayName || credential.user.email?.split('@')[0] || 'Journaler',
                  email: credential.user.email,
                  photoURL: credential.user.photoURL,
                  lastActiveAt: serverTimestamp(),
                },
                { merge: true }
              );
            } catch (dbErr) {
              console.warn('[Firestore] Could not write user doc:', dbErr);
            }
          }
        }
      } catch (err: any) {
        console.error('[Google Sign-In Error]:', err);
        let msg = err.message || 'Failed to sign in with Google.';
        if (err.code === 'auth/popup-closed-by-user') {
          msg = 'Sign-in cancelled. The Google sign-in window was closed.';
        } else if (err.code === 'auth/popup-blocked') {
          msg = 'The Google sign-in popup was blocked by your browser. Please allow popups or open this app in a full window.';
        } else if (err.code === 'auth/unauthorized-domain') {
          msg = 'This domain is not authorized in Firebase Console > Authentication > Settings > Authorized domains.';
        }
        setError(msg);
        throw err;
      }
    } else {
      // Local dev fallback
      const mockUid = `google_demo_${Date.now().toString(36)}`;
      const mockUser: AppUser = {
        uid: mockUid,
        email: 'user@example.com',
        displayName: 'Google User',
        photoURL: null,
        emailVerified: true,
        isSimulated: true,
      };
      const mockToken = `mock-token-${mockUid}`;
      setUser(mockUser);
      setIdToken(mockToken);
      localStorage.setItem('pgj_google_user', JSON.stringify({ user: mockUser, token: mockToken }));
    }
  };

  const logOut = async () => {
    setError(null);
    if (isFirebaseLive && auth) {
      try {
        await signOut(auth);
      } catch (err: any) {
        console.error('SignOut Error:', err);
        setError(err.message || 'Failed to sign out.');
      }
    } else {
      setUser(null);
      setIdToken(null);
      localStorage.removeItem('pgj_google_user');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        isFirebaseLive,
        signInWithGoogle,
        logOut,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

