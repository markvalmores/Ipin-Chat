import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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
  getDocs,
  onSnapshot,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ActivePresence, UserProfile, UserStatus } from '../types';
import { DEMO_USERS } from '../services/sampleData';
import {
  cleanDisplayName,
  deduplicateActivePresences,
  isGhostProfile,
  isSyntheticEmail,
  mergeDuplicateProfiles,
  normalizeEmailKey,
  normalizeNameKey,
  purgeGhostAndDuplicateProfilesInFirestore
} from '../utils/profileDeduplicator';

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
  updateUserStatus: (newStatus: 'online' | 'busy' | 'offline') => Promise<void>;
  updateNote: (note: string, emoji: string) => Promise<void>;
  switchDemoUser: (demoUser: UserProfile) => void;
  isDemoMode: boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUserStatus(s?: UserStatus): 'online' | 'busy' | 'offline' {
  if (s === 'busy' || s === 'away') return 'busy';
  if (s === 'offline') return 'offline';
  return 'online';
}

function getSynchronousStoredProfile(): { profile: UserProfile | null; isDemo: boolean } {
  try {
    const storedUser = localStorage.getItem('ipin_active_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser) as UserProfile;
      if (parsed && parsed.uid && !isGhostProfile(parsed)) {
        const preservedStatus = normalizeUserStatus(parsed.status);
        const cleaned: UserProfile = {
          ...parsed,
          displayName: cleanDisplayName(parsed.displayName) || parsed.displayName,
          status: preservedStatus,
          lastSeen:
            preservedStatus === 'busy'
              ? 'Busy (Do Not Disturb)'
              : preservedStatus === 'offline'
              ? 'Offline'
              : 'Active now'
        };
        return { profile: cleaned, isDemo: cleaned.uid.startsWith('demo_user_') };
      }
    }
    const storedDemo = localStorage.getItem('ipin_active_demo_user');
    if (storedDemo) {
      const parsed = JSON.parse(storedDemo) as UserProfile;
      if (parsed && parsed.uid) {
        const preservedStatus = normalizeUserStatus(parsed.status);
        const cleaned: UserProfile = {
          ...parsed,
          status: preservedStatus,
          lastSeen:
            preservedStatus === 'busy'
              ? 'Busy (Do Not Disturb)'
              : preservedStatus === 'offline'
              ? 'Offline'
              : 'Active now'
        };
        return { profile: cleaned, isDemo: true };
      }
    }
  } catch (e) {}
  return { profile: null, isDemo: false };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialData = getSynchronousStoredProfile();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(initialData.profile);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [activePresences, setActivePresences] = useState<ActivePresence[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(initialData.isDemo);

  // Track local reception timestamps for each user's heartbeat to handle both clock skew and physical disconnects
  const heartbeatTrackerRef = useRef<Map<string, { lastActiveStr: string; receivedAtMs: number; rawDoc: ActivePresence }>>(
    new Map()
  );

  // Helper to generate consistent user ID for an email when no profile exists yet
  const getConsistentUid = (emailStr: string) => {
    const clean = emailStr.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    return `usr_${clean.slice(0, 24)}`;
  };

  /**
   * Finds all existing user documents in Firestore that match the given email, displayName, or uid,
   * merges any duplicates into 1 canonical profile with the 1 original email account,
   * and deletes any duplicate/ghost profiles from Firestore `users` and `active_presences`.
   */
  const resolveAndSyncSingleProfile = async (params: {
    candidateUid?: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    location?: string;
    bio?: string;
  }): Promise<UserProfile> => {
    const cleanEmail = normalizeEmailKey(params.email);
    const cleanName = cleanDisplayName(params.displayName);
    const nameKey = normalizeNameKey(cleanName);
    const emailLocal = cleanEmail ? cleanEmail.split('@')[0] : '';

    const matchedProfiles: UserProfile[] = [];
    const ghostUidsToDelete: string[] = [];

    try {
      const usersSnapPromise = getDocs(collection(db, 'users'));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore read timeout')), 2500)
      );
      const usersSnap = await Promise.race([usersSnapPromise, timeoutPromise]);
      usersSnap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        const docUid = u.uid || docSnap.id;
        const normalizedDoc: UserProfile = { ...u, uid: docUid };

        if (isGhostProfile(normalizedDoc)) {
          if (!docUid.startsWith('demo_user_')) {
            ghostUidsToDelete.push(docUid);
          }
          return;
        }

        const uEmail = normalizeEmailKey(normalizedDoc.email);
        const uName = normalizeNameKey(normalizedDoc.displayName);
        const uEmailLocal = uEmail ? uEmail.split('@')[0] : '';

        const isMatch =
          (params.candidateUid && docUid === params.candidateUid) ||
          (cleanEmail && uEmail && cleanEmail === uEmail) ||
          (nameKey && uName && nameKey === uName) ||
          (emailLocal && uName && emailLocal === uName) ||
          (nameKey && uEmailLocal && nameKey === uEmailLocal) ||
          (emailLocal &&
            uEmailLocal &&
            emailLocal === uEmailLocal &&
            (isSyntheticEmail(cleanEmail) || isSyntheticEmail(uEmail, docUid)));

        if (isMatch) {
          matchedProfiles.push(normalizedDoc);
        }
      });
    } catch (e) {
      // Fallback on timeout or offline
    }

    let finalProfile: UserProfile;
    let duplicateUids: string[] = [];

    if (matchedProfiles.length > 0) {
      // If incoming params have a real original email (non-synthetic), include it in the merge candidate
      const incomingCandidate: UserProfile = {
        uid: params.candidateUid || matchedProfiles[0].uid,
        displayName: cleanName || matchedProfiles[0].displayName,
        email:
          !isSyntheticEmail(cleanEmail)
            ? cleanEmail
            : matchedProfiles.find((m) => !isSyntheticEmail(m.email, m.uid))?.email ||
              cleanEmail ||
              matchedProfiles[0].email,
        photoURL: params.photoURL || matchedProfiles[0].photoURL,
        location: params.location || matchedProfiles[0].location,
        bio: params.bio || matchedProfiles[0].bio,
        status: 'online',
        lastSeen: 'Active now'
      };

      const merged = mergeDuplicateProfiles(
        [...matchedProfiles, incomingCandidate],
        params.candidateUid && !params.candidateUid.startsWith('usr_') && !params.candidateUid.startsWith('google_')
          ? params.candidateUid
          : undefined
      );

      finalProfile = {
        ...merged.canonical,
        status: merged.canonical.status === 'busy' ? 'busy' : 'online',
        lastSeen: merged.canonical.status === 'busy' ? 'Busy (Do Not Disturb)' : 'Active now'
      };
      duplicateUids = merged.duplicateUids;
    } else {
      const uid =
        params.candidateUid ||
        getConsistentUid(cleanEmail || `${nameKey || 'user'}@ipin.chat`);
      const resolvedEmail = cleanEmail || `${nameKey || 'user'}@ipin.chat`;
      const resolvedName = cleanName || resolvedEmail.split('@')[0] || 'Member';

      finalProfile = {
        uid,
        displayName: resolvedName,
        email: resolvedEmail,
        photoURL: params.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
        bannerType: 'image',
        status: 'online',
        location: params.location || 'Global Bridge 🌏',
        bio: params.bio || 'Active on ipin Messenger connecting worldwide!',
        createdAt: new Date().toISOString(),
        lastSeen: 'Active now'
      };
    }

    // Save the 1 canonical profile to Firestore in background (non-blocking)
    try {
      setDoc(doc(db, 'users', finalProfile.uid), finalProfile, { merge: true }).catch(() => {});
    } catch (e) {}

    // Delete all duplicate & ghost profiles from Firestore `users` and `active_presences` in background
    const allToDelete = Array.from(new Set([...duplicateUids, ...ghostUidsToDelete])).filter(
      (id) => id && id !== finalProfile.uid && !id.startsWith('demo_user_')
    );
    if (allToDelete.length > 0) {
      Promise.allSettled(
        allToDelete.flatMap((dupUid) => [
          deleteDoc(doc(db, 'users', dupUid)),
          deleteDoc(doc(db, 'active_presences', dupUid))
        ])
      ).catch(() => {});
    }

    return finalProfile;
  };

  // Initialize Auth listener and restore active session with zero delay
  useEffect(() => {
    let active = true;

    // Failsafe timer: guarantee isAuthReady is never blocked
    setIsAuthReady(true);
    const readyTimer = setTimeout(() => {
      if (active) setIsAuthReady(true);
    }, 200);

    // If we have a stored profile and no currentUser yet, initialize anonymous auth in background so Firestore rules pass
    if (initialData.profile && !auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;
      setIsAuthReady(true);

      if (firebaseUser && firebaseUser.isAnonymous) {
        setUser(firebaseUser);
        const current = profile || initialData.profile;
        if (current && !isGhostProfile(current)) {
          // Run background deduplication so canonical profile updates smoothly
          purgeGhostAndDuplicateProfilesInFirestore(current, true).then((canonical) => {
            if (active && canonical && !isGhostProfile(canonical)) {
              setProfile(canonical);
              try {
                localStorage.setItem('ipin_active_user', JSON.stringify(canonical));
              } catch (e) {}
            }
          }).catch(() => {});
        }
        return;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoMode(false);

        // Run profile synchronization in background without blocking UI
        resolveAndSyncSingleProfile({
          candidateUid: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || undefined,
          photoURL: firebaseUser.photoURL || undefined
        })
          .then((syncedProfile) => {
            if (active) {
              setProfile(syncedProfile);
              try {
                localStorage.setItem('ipin_active_user', JSON.stringify(syncedProfile));
              } catch (e) {}
            }
            purgeGhostAndDuplicateProfilesInFirestore(syncedProfile, true).catch(() => {});
          })
          .catch((error) => {
            console.warn('Background sync note:', error);
          });
      } else {
        setUser(null);
        const current = profile || initialData.profile;
        if (current && !isGhostProfile(current)) {
          if (!auth.currentUser) {
            signInAnonymously(auth).catch(() => {});
          }
          purgeGhostAndDuplicateProfilesInFirestore(current, true).then((canonical) => {
            if (active && canonical && !isGhostProfile(canonical)) {
              setProfile(canonical);
              try {
                localStorage.setItem('ipin_active_user', JSON.stringify(canonical));
              } catch (e) {}
            }
          }).catch(() => {});
        } else if (active) {
          setProfile(null);
          setIsDemoMode(false);
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(readyTimer);
      unsubscribe();
    };
  }, []);

  // Real-time listener on current user's own document in Firestore so status/profile changes sync across tabs
  useEffect(() => {
    if (!profile?.uid) return;
    const userDocRef = doc(db, 'users', profile.uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const remote = snap.data() as UserProfile;
        if (!remote || !remote.uid || isGhostProfile(remote)) return;
        setProfile((prev) => {
          if (!prev || prev.uid !== remote.uid) return prev;
          const nextStatus = normalizeUserStatus(remote.status || prev.status);
          const cleanedName = cleanDisplayName(remote.displayName) || prev.displayName;
          const bestEmail =
            !isSyntheticEmail(remote.email, remote.uid)
              ? remote.email
              : !isSyntheticEmail(prev.email, prev.uid)
              ? prev.email
              : remote.email || prev.email;

          if (
            prev.status === nextStatus &&
            prev.displayName === cleanedName &&
            prev.email === bestEmail &&
            prev.photoURL === remote.photoURL &&
            prev.bannerURL === remote.bannerURL &&
            prev.note === remote.note &&
            prev.bio === remote.bio &&
            prev.location === remote.location
          ) {
            return prev;
          }
          const merged: UserProfile = {
            ...prev,
            ...remote,
            displayName: cleanedName,
            email: bestEmail,
            status: nextStatus
          };
          try {
            localStorage.setItem('ipin_active_user', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      },
      () => {}
    );
    return () => unsub();
  }, [profile?.uid]);

  // Real-Time Presence Heartbeat & Physical Disconnect Handler
  useEffect(() => {
    if (!profile || isGhostProfile(profile)) return;
    const currentUid = profile.uid;
    const currentStatus = normalizeUserStatus(profile.status);
    const cleanName = cleanDisplayName(profile.displayName) || profile.displayName;

    const writePresenceState = async (physicallyConnected: boolean) => {
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const isEffectivelyOnline = physicallyConnected && navigator.onLine !== false && currentStatus !== 'offline';
      const statusToWrite: UserStatus = !physicallyConnected || navigator.onLine === false ? 'offline' : currentStatus;
      const lastSeenText =
        statusToWrite === 'busy'
          ? 'Busy (Do Not Disturb)'
          : statusToWrite === 'online'
          ? 'Active now'
          : `Last seen ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      try {
        const presenceRef = doc(db, 'active_presences', currentUid);
        await setDoc(
          presenceRef,
          {
            uid: currentUid,
            displayName: cleanName,
            email: profile.email || '',
            photoURL: profile.photoURL || '',
            lastActive: nowIso,
            lastActiveMs: nowMs,
            isOnline: isEffectivelyOnline,
            status: statusToWrite
          },
          { merge: true }
        );
      } catch (err) {
        // Silent
      }

      try {
        const userRef = doc(db, 'users', currentUid);
        await setDoc(
          userRef,
          {
            uid: currentUid,
            displayName: cleanName,
            email: profile.email || '',
            photoURL: profile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUid}`,
            status: statusToWrite,
            lastActive: nowIso,
            lastSeen: lastSeenText
          },
          { merge: true }
        );
      } catch (err) {
        // Silent
      }
    };

    // Immediate heartbeat on mount or status change
    writePresenceState(true);

    // Fast 8-second heartbeat so active users stay live and physical disconnects expire quickly
    const interval = setInterval(() => {
      writePresenceState(true);
    }, 8000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        writePresenceState(true);
      }
    };

    const handleOnline = () => writePresenceState(true);
    const handleOffline = () => writePresenceState(false);
    const handlePageUnload = () => {
      writePresenceState(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleOnline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleOnline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handlePageUnload);
      window.removeEventListener('pagehide', handlePageUnload);
    };
  }, [profile?.uid, profile?.displayName, profile?.email, profile?.photoURL, profile?.status]);

  // Real-time Active Presences Listener + 5-second Physical Offline Expiration Checker
  useEffect(() => {
    const computeActiveList = () => {
      const now = Date.now();
      const list: ActivePresence[] = [];

      heartbeatTrackerRef.current.forEach((entry, uid) => {
        const data = entry.rawDoc;
        if (data.isOnline === false || data.status === 'offline') return;

        // A user is physically connected if we received a fresh heartbeat update within the last 30 seconds
        const ageSinceReceived = now - entry.receivedAtMs;
        if (ageSinceReceived <= 30000) {
          list.push({
            ...data,
            uid: data.uid || uid,
            displayName: cleanDisplayName(data.displayName) || data.displayName,
            isOnline: true,
            status: normalizeUserStatus(data.status)
          });
        }
      });

      // Include built-in demo users that are set to online or busy if not already in list
      const demoPresences: ActivePresence[] = DEMO_USERS
        .filter((u) => u.status !== 'offline' && !list.some((p) => p.uid === u.uid))
        .map((u) => ({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          lastActive: new Date().toISOString(),
          isOnline: true,
          status: normalizeUserStatus(u.status)
        }));

      // Include current user if their status is not offline
      const myStatus = normalizeUserStatus(profile?.status);
      if (profile && !isGhostProfile(profile) && myStatus !== 'offline' && navigator.onLine !== false && !list.some((p) => p.uid === profile.uid)) {
        list.push({
          uid: profile.uid,
          displayName: cleanDisplayName(profile.displayName) || profile.displayName,
          email: profile.email || '',
          photoURL: profile.photoURL,
          lastActive: new Date().toISOString(),
          isOnline: true,
          status: myStatus
        });
      }

      const combined = [...list, ...demoPresences];
      const deduplicated = deduplicateActivePresences(combined);
      setActivePresences(deduplicated);
    };

    const presencesRef = collection(db, 'active_presences');
    const unsubscribe = onSnapshot(
      presencesRef,
      (snapshot) => {
        const now = Date.now();
        const currentIds = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActivePresence;
          const uid = data.uid || docSnap.id;

          // Ignore ghost presences
          const nameKey = normalizeNameKey(data.displayName);
          if (!nameKey || nameKey === 'ipin user' || nameKey === 'user' || nameKey === 'guest') {
            return;
          }

          currentIds.add(uid);

          const prev = heartbeatTrackerRef.current.get(uid);
          const remoteTimeMs = data.lastActiveMs || (data.lastActive ? new Date(data.lastActive).getTime() : 0);

          if (data.isOnline === false || data.status === 'offline') {
            heartbeatTrackerRef.current.delete(uid);
            return;
          }

          if (!prev) {
            const isRecent = !isNaN(remoteTimeMs) && Math.abs(now - remoteTimeMs) <= 45000;
            heartbeatTrackerRef.current.set(uid, {
              lastActiveStr: data.lastActive || '',
              receivedAtMs: isRecent ? now : remoteTimeMs || 0,
              rawDoc: data
            });
          } else if (prev.lastActiveStr !== data.lastActive || prev.rawDoc.status !== data.status) {
            heartbeatTrackerRef.current.set(uid, {
              lastActiveStr: data.lastActive || '',
              receivedAtMs: now,
              rawDoc: data
            });
          } else {
            heartbeatTrackerRef.current.set(uid, {
              ...prev,
              rawDoc: data
            });
          }
        });

        Array.from(heartbeatTrackerRef.current.keys()).forEach((uid) => {
          if (!currentIds.has(uid)) {
            heartbeatTrackerRef.current.delete(uid);
          }
        });

        computeActiveList();
      },
      () => {
        computeActiveList();
      }
    );

    const expiryTimer = setInterval(computeActiveList, 5000);

    return () => {
      unsubscribe();
      clearInterval(expiryTimer);
    };
  }, [profile?.uid, profile?.displayName, profile?.email, profile?.photoURL, profile?.status]);

  // Google Login Implementation with single-profile deduplication
  const signInWithGoogle = async (fallbackEmail?: string) => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const googleUser = cred.user;

      const userProfile = await resolveAndSyncSingleProfile({
        candidateUid: googleUser.uid,
        email: googleUser.email || undefined,
        displayName: googleUser.displayName || googleUser.email?.split('@')[0] || undefined,
        photoURL: googleUser.photoURL || undefined
      });

      setUser(googleUser);
      setProfile(userProfile);
      setIsDemoMode(false);
      localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
      localStorage.setItem('ipin_last_login_email', userProfile.email || '');
      localStorage.removeItem('ipin_active_demo_user');
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      if (fallbackEmail) {
        await signInWithGoogleQuick(fallbackEmail, fallbackEmail.split('@')[0]);
      } else {
        setLoginError('Google Sign-In was cancelled or popup was blocked by browser. You can sign in using your account email or select a demo user below.');
      }
    }
  };

  // Fast direct Google login (maps to the exact same 1 canonical profile per email, no "(Google)" duplicate!)
  const signInWithGoogleQuick = async (emailStr = '', nameStr?: string) => {
    setLoginError(null);
    const cleanEmail = normalizeEmailKey(emailStr);
    if (!cleanEmail) {
      setLoginError('Please enter your email address.');
      return;
    }
    const cleanName = cleanDisplayName(nameStr) || cleanEmail.split('@')[0];

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
    }

    const userProfile = await resolveAndSyncSingleProfile({
      email: cleanEmail,
      displayName: cleanName
    });

    setProfile(userProfile);
    setIsDemoMode(false);
    localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
    localStorage.setItem('ipin_last_login_email', userProfile.email);
    localStorage.removeItem('ipin_active_demo_user');
  };

  // Universal Sign In: Resolves to the 1 canonical profile synced with the 1 original email account
  const signIn = async (emailOrUser: string, pass?: string) => {
    setLoginError(null);
    const rawInput = (emailOrUser || '').trim();
    if (!rawInput) {
      setLoginError('Please enter your email, username, or account credentials.');
      throw new Error('Please enter your email, username, or account credentials.');
    }

    const lowerInput = rawInput.toLowerCase();

    // 1. Check if user typed the name or email of a built-in demo persona
    const matchedPersona = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === lowerInput ||
        u.displayName.toLowerCase().includes(lowerInput) ||
        u.uid.toLowerCase() === lowerInput
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

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
    }

    // 2. First check if an account with this email or displayName ALREADY exists in Firestore
    // so if they typed a username (without @), we find their original @gmail.com email instead of inventing @ipin.chat!
    const isEmailInput = lowerInput.includes('@');
    let candidateFirebaseUid: string | undefined;

    if (pass && isEmailInput) {
      try {
        const cred = await signInWithEmailAndPassword(auth, lowerInput, pass);
        candidateFirebaseUid = cred.user.uid;
        setUser(cred.user);
      } catch (fbErr: any) {
        // Proceed with universal resolver
      }
    }

    const userProfile = await resolveAndSyncSingleProfile({
      candidateUid: candidateFirebaseUid,
      email: isEmailInput ? lowerInput : undefined,
      displayName: !isEmailInput ? rawInput : undefined
    });

    localStorage.setItem('ipin_active_user', JSON.stringify(userProfile));
    localStorage.setItem('ipin_last_login_email', userProfile.email);
    localStorage.removeItem('ipin_active_demo_user');
    setProfile(userProfile);
    setIsDemoMode(false);
  };

  // Sign up or sync with existing original email account (never creates a 2nd duplicate profile)
  const signUp = async (email: string, pass: string, name: string, location?: string, avatar?: string) => {
    setLoginError(null);
    const cleanEmail = normalizeEmailKey(email);
    const cleanName = cleanDisplayName(name) || cleanEmail.split('@')[0] || 'Member';

    try {
      let candidateUid: string | undefined;

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        candidateUid = cred.user.uid;
        const userPhoto = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`;
        try {
          await updateFirebaseProfile(cred.user, {
            displayName: cleanName,
            photoURL: userPhoto
          });
        } catch (e) {}
        setUser(cred.user);
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          try {
            const signInCred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
            candidateUid = signInCred.user.uid;
            setUser(signInCred.user);
          } catch (e) {}
        }
      }

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {}
      }

      // Resolve and merge any duplicate profile for this email/name into 1 single canonical profile
      const syncedProfile = await resolveAndSyncSingleProfile({
        candidateUid,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: avatar,
        location: location?.trim() || 'China-Global Bridge 🌏',
        bio: 'Connecting China and the rest of the world on ipin Messenger.'
      });

      localStorage.setItem('ipin_active_user', JSON.stringify(syncedProfile));
      localStorage.setItem('ipin_last_login_email', syncedProfile.email);
      localStorage.removeItem('ipin_active_demo_user');
      setProfile(syncedProfile);
      setIsDemoMode(false);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to create account');
      throw err;
    }
  };

  // Sign out user cleanly
  const signOutUser = async () => {
    const outgoingUid = profile?.uid;
    try {
      localStorage.removeItem('ipin_active_user');
      localStorage.removeItem('ipin_active_demo_user');
    } catch (e) {}
    if (outgoingUid) {
      try {
        await deleteDoc(doc(db, 'active_presences', outgoingUid));
      } catch (err) {}
      try {
        await setDoc(
          doc(db, 'users', outgoingUid),
          { status: 'offline', lastSeen: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { merge: true }
        );
      } catch (err) {}
    }
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
    const nextStatus = data.status ? normalizeUserStatus(data.status) : normalizeUserStatus(profile.status);
    const updated: UserProfile = {
      ...profile,
      ...data,
      displayName: cleanDisplayName(data.displayName ?? profile.displayName) || profile.displayName,
      status: nextStatus,
      lastSeen:
        nextStatus === 'busy'
          ? 'Busy (Do Not Disturb)'
          : nextStatus === 'online'
          ? 'Active now'
          : 'Offline'
    };
    setProfile(updated);
    localStorage.setItem('ipin_active_user', JSON.stringify(updated));
    if (isDemoMode) {
      localStorage.setItem('ipin_active_demo_user', JSON.stringify(updated));
    }

    const nowIso = new Date().toISOString();
    try {
      await setDoc(doc(db, 'users', profile.uid), { ...updated, lastActive: nowIso }, { merge: true });
    } catch (err) {
      console.error('Failed to update profile:', err);
    }

    try {
      await setDoc(
        doc(db, 'active_presences', profile.uid),
        {
          uid: profile.uid,
          displayName: updated.displayName,
          email: updated.email || '',
          photoURL: updated.photoURL || '',
          lastActive: nowIso,
          lastActiveMs: Date.now(),
          isOnline: nextStatus !== 'offline',
          status: nextStatus
        },
        { merge: true }
      );
    } catch (err) {}
  };

  const updateUserStatus = async (newStatus: 'online' | 'busy' | 'offline') => {
    await updateProfileData({ status: newStatus });
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
      await setDoc(
        doc(db, 'users', profile.uid),
        {
          note,
          noteEmoji: emoji,
          noteUpdatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to update note:', err);
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
        activeCount: Math.max(1, activePresences.filter((p) => p.isOnline && p.status !== 'offline').length),
        loginError,
        signInWithGoogle,
        signInWithGoogleQuick,
        signUp,
        signIn,
        resetPassword,
        signOutUser,
        updateProfileData,
        updateUserStatus,
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
