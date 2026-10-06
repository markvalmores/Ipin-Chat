import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { ActivePresence, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  activePresences: ActivePresence[];
  activeCount: number;
  loginError: string | null;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, pass: string, name: string, location?: string, avatar?: string) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateNote: (note: string, emoji: string) => Promise<void>;
  switchDemoUser: (demoUser: UserProfile) => void;
  isDemoMode: boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activePresences, setActivePresences] = useState<ActivePresence[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Initialize Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoMode(false);
        // Load or create user document
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const snapshot = await getDoc(userDocRef);
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ipin User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
              bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
              bannerType: 'image',
              status: 'online',
              location: 'Global Bridge 🌏',
              bio: 'Active on ipin Messenger connecting worldwide!',
              createdAt: new Date().toISOString(),
              lastSeen: 'Active now'
            };
            await setDoc(userDocRef, initialProfile);
            setProfile(initialProfile);
          }
        } catch (error) {
          console.warn("Could not fetch user profile from Firestore:", error);
          setProfile({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'ipin User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            status: 'online'
          });
        }
      } else {
        setUser(null);
        try {
          const stored = localStorage.getItem('ipin_active_demo_user');
          if (stored) {
            setProfile(JSON.parse(stored));
            setIsDemoMode(true);
          } else {
            setProfile(null);
            setIsDemoMode(false);
          }
        } catch (e) {
          setProfile(null);
          setIsDemoMode(false);
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  // Presence Heartbeat Updater
  useEffect(() => {
    if (!profile) return;
    const currentUid = profile.uid;

    const updatePresence = async () => {
      try {
        const presenceRef = doc(db, 'active_presences', currentUid);
        await setDoc(presenceRef, {
          uid: currentUid,
          displayName: profile.displayName,
          photoURL: profile.photoURL || '',
          lastActive: new Date().toISOString(),
          isOnline: true
        });
      } catch (err) {
        // Log quietly
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // 30s heartbeat

    const handleBeforeUnload = async () => {
      try {
        const presenceRef = doc(db, 'active_presences', currentUid);
        await deleteDoc(presenceRef);
      } catch (err) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile?.uid, profile?.displayName, profile?.photoURL]);

  // Real-time Active Presences Listener
  useEffect(() => {
    const presencesRef = collection(db, 'active_presences');
    const unsubscribe = onSnapshot(presencesRef, (snapshot) => {
      const list: ActivePresence[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ActivePresence;
        // Consider active if timestamp is within last 3 minutes
        const activeTime = new Date(data.lastActive).getTime();
        if (now - activeTime < 3 * 60 * 1000) {
          list.push(data);
        }
      });

      // Ensure demo users are also included in presence if not already there
      const onlineDemoPresences: ActivePresence[] = DEMO_USERS
        .filter(u => u.status === 'online' && !list.some(p => p.uid === u.uid))
        .map(u => ({
          uid: u.uid,
          displayName: u.displayName,
          photoURL: u.photoURL,
          lastActive: new Date().toISOString(),
          isOnline: true
        }));

      // If current profile is not in list, add it
      if (profile && !list.some(p => p.uid === profile.uid)) {
        list.push({
          uid: profile.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          lastActive: new Date().toISOString(),
          isOnline: true
        });
      }

      const combined = [...list, ...onlineDemoPresences];
      // Deduplicate by uid
      const unique = Array.from(new Map(combined.map(item => [item.uid, item])).values());
      setActivePresences(unique);
    }, (error) => {
      // Fallback demo presence list
      const fallback: ActivePresence[] = DEMO_USERS.map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL,
        lastActive: new Date().toISOString(),
        isOnline: u.status === 'online'
      }));
      setActivePresences(fallback);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const signUp = async (email: string, pass: string, name: string, location?: string, avatar?: string) => {
    setLoginError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const userPhoto = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`;
      await updateFirebaseProfile(cred.user, {
        displayName: name,
        photoURL: userPhoto
      });

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        displayName: name,
        email: email,
        photoURL: userPhoto,
        bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
        bannerType: 'image',
        status: 'online',
        location: location || 'China-Global Bridge 🌏',
        bio: 'Connecting China and the rest of the world on ipin Messenger.',
        createdAt: new Date().toISOString(),
        lastSeen: 'Active now'
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setProfile(newProfile);
      setIsDemoMode(false);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign up');
      throw err;
    }
  };

  const signIn = async (email: string, pass: string) => {
    setLoginError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const snapshot = await getDoc(doc(db, 'users', cred.user.uid));
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
      setIsDemoMode(false);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setLoginError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to send reset email');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      try {
        localStorage.removeItem('ipin_active_demo_user');
      } catch (e) {}
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign in with Google');
      throw err;
    }
  };

  const signOutUser = async () => {
    if (profile?.uid) {
      try {
        await deleteDoc(doc(db, 'active_presences', profile.uid));
      } catch (err) {}
    }
    try {
      localStorage.removeItem('ipin_active_demo_user');
    } catch (e) {}
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...data };
    setProfile(updated);
    if (!isDemoMode && user) {
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (err) {
        console.error("Failed to update profile:", err);
      }
    }
  };

  const updateNote = async (note: string, emoji: string) => {
    if (!profile) return;
    const updated = {
      ...profile,
      note,
      noteEmoji: emoji,
      noteUpdatedAt: new Date().toISOString()
    };
    setProfile(updated);
    if (!isDemoMode && user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          note,
          noteEmoji: emoji,
          noteUpdatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update note:", err);
      }
    }
  };

  const switchDemoUser = async (demoUser: UserProfile) => {
    setProfile(demoUser);
    setIsDemoMode(true);
    try {
      localStorage.setItem('ipin_active_demo_user', JSON.stringify(demoUser));
    } catch (e) {}
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        // Silently continue in local demo mode
      }
    }
  };

  const clearError = () => setLoginError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthReady,
        activePresences,
        activeCount: Math.max(1, activePresences.length),
        loginError,
        signInWithGoogle,
        signUp,
        signIn,
        resetPassword,
        signOutUser,
        updateProfileData,
        updateNote,
        switchDemoUser,
        isDemoMode,
        clearError
      }}
    >
      {children}
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
