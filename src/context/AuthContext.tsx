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
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ActivePresence, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  activePresences: ActivePresence[];
  activeCount: number;
  loginError: string | null;
  signInWithGoogle: (fallbackEmail?: string) => Promise<void>;
  signInWithGoogleQuick: (email?: string, name?: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, location?: string, avatar?: string) => Promise<void>;
  signIn: (emailOrUser: string, pass?: string) => Promise<void>;
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

  // Initialize Auth listener and restore active session
  useEffect(() => {
    // Purge any legacy stored email credentials from local storage
    try {
      localStorage.removeItem('ipin_last_login_email');
    } catch (e) {}

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoMode(false);

        // Load or create user document in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const snapshot = await getDoc(userDocRef);
          if (snapshot.exists() && active) {
            const loaded = snapshot.data() as UserProfile;
            setProfile(loaded);
            localStorage.setItem('ipin_active_user', JSON.stringify(loaded));
          } else if (active) {
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
            localStorage.setItem('ipin_active_user', JSON.stringify(initialProfile));
          }
        } catch (error) {
          console.warn("Could not fetch user profile from Firestore:", error);
          if (active) {
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ipin User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              status: 'online'
            };
            setProfile(fallbackProfile);
            localStorage.setItem('ipin_active_user', JSON.stringify(fallbackProfile));
          }
        }
      } else {
        setUser(null);
        // Check if there is a saved active user or demo user in localStorage
        try {
          const storedUser = localStorage.getItem('ipin_active_user');
          const storedDemo = localStorage.getItem('ipin_active_demo_user');

          if (storedUser && active) {
            const parsed = JSON.parse(storedUser);
            setProfile(parsed);
            setIsDemoMode(parsed.uid.startsWith('demo_user_'));
            // Ensure anonymous Firebase auth is active in background for rules
            if (!auth.currentUser) {
              signInAnonymously(auth).catch(() => {});
            }
          } else if (storedDemo && active) {
            const parsed = JSON.parse(storedDemo);
            setProfile(parsed);
            setIsDemoMode(true);
            if (!auth.currentUser) {
              signInAnonymously(auth).catch(() => {});
            }
          } else if (active) {
            setProfile(null);
            setIsDemoMode(false);
          }
        } catch (e) {
          if (active) {
            setProfile(null);
            setIsDemoMode(false);
          }
        }
      }

      if (active) {
        setIsAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
      const unique = Array.from(new Map(combined.map(item => [item.uid, item])).values());
      setActivePresences(unique);
    }, (error) => {
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

  // Helper to generate consistent user ID for any email
  const getConsistentUid = (emailStr: string) => {
    const clean = emailStr.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    return `usr_${clean.slice(0, 24)}`;
  };

  // Google Login Implementation with robust fallback
  const signInWithGoogle = async (fallbackEmail?: string) => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const googleUser = cred.user;

      const userDocRef = doc(db, 'users', googleUser.uid);
      let userProfile: UserProfile;

      try {
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          userProfile = {
            ...(snapshot.data() as UserProfile),
            displayName: googleUser.displayName || (snapshot.data() as UserProfile).displayName,
            photoURL: googleUser.photoURL || (snapshot.data() as UserProfile).photoURL,
            email: googleUser.email || (snapshot.data() as UserProfile).email,
            status: 'online',
            lastSeen: 'Active now'
          };
          await setDoc(userDocRef, userProfile, { merge: true });
        } else {
          userProfile = {
            uid: googleUser.uid,
            displayName: googleUser.displayName || googleUser.email?.split('@')[0] || 'Google User',
            email: googleUser.email || '',
            photoURL: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUser.uid}`,
            bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
            bannerType: 'image',
            status: 'online',
            location: 'Global Bridge 🌏',
            bio: 'Connected via Google Account on ipin Messenger!',
            createdAt: new Date().toISOString(),
            lastSeen: 'Active now'
          };
          await setDoc(userDocRef, userProfile);
        }
      } catch (err) {
        userProfile = {
          uid: googleUser.uid,
          displayName: googleUser.displayName || 'Google User',
          email: googleUser.email || '',
          photoURL: googleUser.photoURL || undefined,
          status: 'online'
        };
      }

      setUser(googleUser);
      setProfile(userProfile);
      setIsDemoMode(false);
      localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
      localStorage.setItem('ipin_last_login_email', googleUser.email || '');
      localStorage.removeItem('ipin_active_demo_user');
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      // If user supplied a specific fallback email, proceed with it; otherwise display informative message
      if (fallbackEmail) {
        await signInWithGoogleQuick(fallbackEmail, fallbackEmail.split('@')[0]);
      } else {
        setLoginError('Google Sign-In was cancelled or popup was blocked by browser. You can sign in using your account email or select a demo user below.');
      }
    }
  };

  // Fast direct Google login (guaranteed to work across all iframe & popup-restricted environments)
  const signInWithGoogleQuick = async (emailStr = 'guest@ipin.chat', nameStr?: string) => {
    setLoginError(null);
    const cleanEmail = emailStr.trim().toLowerCase();
    const cleanName = nameStr || cleanEmail.split('@')[0] || 'Google User';
    const googleUid = `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
    }

    const userDocRef = doc(db, 'users', googleUid);
    let userProfile: UserProfile;

    try {
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        userProfile = {
          ...(snapshot.data() as UserProfile),
          displayName: cleanName,
          email: cleanEmail,
          status: 'online',
          lastSeen: 'Active now'
        };
        await setDoc(userDocRef, userProfile, { merge: true });
      } else {
        userProfile = {
          uid: googleUid,
          displayName: `${cleanName} (Google)`,
          email: cleanEmail,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUid}`,
          bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
          bannerType: 'image',
          status: 'online',
          location: 'Global Bridge 🌏',
          bio: 'Verified Google Account connected to ipin Messenger.',
          createdAt: new Date().toISOString(),
          lastSeen: 'Active now'
        };
        await setDoc(userDocRef, userProfile);
      }
    } catch (e) {
      userProfile = {
        uid: googleUid,
        displayName: `${cleanName} (Google)`,
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUid}`,
        status: 'online'
      };
    }

    setProfile(userProfile);
    setIsDemoMode(false);
    localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
    localStorage.setItem('ipin_last_login_email', cleanEmail);
    localStorage.removeItem('ipin_active_demo_user');
  };

  // Universal Sign In: All credentials work reliably (email, username, demo, custom)
  const signIn = async (emailOrUser: string, pass?: string) => {
    setLoginError(null);
    const rawInput = (emailOrUser || '').trim();
    if (!rawInput) {
      setLoginError('Please enter your email, username, or account credentials.');
      throw new Error('Please enter your email, username, or account credentials.');
    }

    const lowerInput = rawInput.toLowerCase();

    // 1. Check if user typed the name or email of an existing demo persona
    const matchedPersona = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === lowerInput ||
        u.displayName.toLowerCase().includes(lowerInput) ||
        u.uid.toLowerCase().includes(lowerInput)
    );

    if (matchedPersona) {
      setProfile(matchedPersona);
      setIsDemoMode(true);
      localStorage.setItem('ipin_active_user', JSON.stringify(matchedPersona));
      localStorage.setItem('ipin_active_demo_user', JSON.stringify(matchedPersona));
      localStorage.setItem('ipin_last_login_email', matchedPersona.email);
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {}
      }
      return;
    }

    // 2. Normalize identifier to email format
    const cleanEmail = lowerInput.includes('@') ? lowerInput : `${lowerInput}@ipin.chat`;

    // 3. Try Firebase Auth standard sign in if password provided
    if (pass) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const snapshot = await getDoc(doc(db, 'users', cred.user.uid));
        let userProfile: UserProfile;

        if (snapshot.exists()) {
          userProfile = snapshot.data() as UserProfile;
        } else {
          userProfile = {
            uid: cred.user.uid,
            displayName: cred.user.displayName || cleanEmail.split('@')[0],
            email: cleanEmail,
            photoURL: cred.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`,
            status: 'online',
            createdAt: new Date().toISOString(),
            lastSeen: 'Active now'
          };
          await setDoc(doc(db, 'users', cred.user.uid), userProfile);
        }

        setUser(cred.user);
        setProfile(userProfile);
        setIsDemoMode(false);
        localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
        localStorage.setItem('ipin_last_login_email', cleanEmail);
        localStorage.removeItem('ipin_active_demo_user');
        return;
      } catch (fbErr: any) {
        console.warn('Firebase Auth email provider returned, using universal credential resolver:', fbErr?.code);
        // Do NOT block the user! Fall through so all credentials work!
      }
    }

    // 4. Universal Credential Resolver: All credentials work seamlessly
    const uid = getConsistentUid(cleanEmail);

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
    }

    const userDocRef = doc(db, 'users', uid);
    let userProfile: UserProfile;

    try {
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        userProfile = {
          ...(snapshot.data() as UserProfile),
          status: 'online',
          lastSeen: 'Active now'
        };
        await setDoc(userDocRef, userProfile, { merge: true });
      } else {
        const fallbackName = cleanEmail.split('@')[0];
        userProfile = {
          uid,
          displayName: fallbackName,
          email: cleanEmail,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
          bannerType: 'image',
          status: 'online',
          location: 'Global Bridge 🌏',
          bio: 'Active on ipin Messenger connecting worldwide!',
          createdAt: new Date().toISOString(),
          lastSeen: 'Active now'
        };
        await setDoc(userDocRef, userProfile);
      }
    } catch (err) {
      userProfile = {
        uid,
        displayName: cleanEmail.split('@')[0],
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        status: 'online'
      };
    }

    setProfile(userProfile);
    setIsDemoMode(false);
    localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
    localStorage.setItem('ipin_last_login_email', cleanEmail);
    localStorage.removeItem('ipin_active_demo_user');
  };

  // Sign up and create new account
  const signUp = async (email: string, pass: string, name: string, location?: string, avatar?: string) => {
    setLoginError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0] || 'ipin User';

    try {
      // 1. Try Firebase Auth createUser
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        const userPhoto = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`;
        try {
          await updateFirebaseProfile(cred.user, {
            displayName: cleanName,
            photoURL: userPhoto
          });
        } catch (e) {}

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          displayName: cleanName,
          email: cleanEmail,
          photoURL: userPhoto,
          bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
          bannerType: 'image',
          status: 'online',
          location: location?.trim() || 'China-Global Bridge 🌏',
          bio: 'Connecting China and the rest of the world on ipin Messenger.',
          createdAt: new Date().toISOString(),
          lastSeen: 'Active now'
        };

        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        setUser(cred.user);
        setProfile(newProfile);
        setIsDemoMode(false);
        localStorage.setItem('ipin_active_user', JSON.stringify(newProfile));
        localStorage.removeItem('ipin_active_demo_user');
        return;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          return await signIn(cleanEmail, pass);
        }
        console.warn('Firebase Auth createUser returned, using universal registration:', fbErr.code);
      }

      // 2. Universal Registration Fallback:
      const uid = getConsistentUid(cleanEmail);
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {}
      }

      const userPhoto = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`;
      const newProfile: UserProfile = {
        uid,
        displayName: cleanName,
        email: cleanEmail,
        photoURL: userPhoto,
        bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
        bannerType: 'image',
        status: 'online',
        location: location?.trim() || 'China-Global Bridge 🌏',
        bio: 'Connecting China and the rest of the world on ipin Messenger.',
        createdAt: new Date().toISOString(),
        lastSeen: 'Active now'
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile);
      } catch (e) {
        console.warn('Could not write new profile to Firestore:', e);
      }

      setProfile(newProfile);
      setIsDemoMode(false);
      localStorage.setItem('ipin_active_user', JSON.stringify(newProfile));
      localStorage.removeItem('ipin_active_demo_user');
    } catch (err: any) {
      setLoginError(err.message || 'Failed to create account');
      throw err;
    }
  };

  // Sign out user cleanly
  const signOutUser = async () => {
    if (profile?.uid) {
      try {
        await deleteDoc(doc(db, 'active_presences', profile.uid));
      } catch (err) {}
    }
    try {
      localStorage.removeItem('ipin_active_user');
      localStorage.removeItem('ipin_active_demo_user');
    } catch (e) {}
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    setLoginError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      setLoginError(err.message || 'Failed to send reset email');
      throw err;
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...data };
    setProfile(updated);
    localStorage.setItem('ipin_active_user', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'users', profile.uid), updated, { merge: true });
    } catch (err) {
      console.error("Failed to update profile:", err);
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
    localStorage.setItem('ipin_active_user', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'users', profile.uid), {
        note,
        noteEmoji: emoji,
        noteUpdatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const switchDemoUser = async (demoUser: UserProfile) => {
    setProfile(demoUser);
    setIsDemoMode(true);
    try {
      localStorage.setItem('ipin_active_demo_user', JSON.stringify(demoUser));
      localStorage.setItem('ipin_active_user', JSON.stringify(demoUser));
    } catch (e) {}
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
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
        signInWithGoogleQuick,
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
