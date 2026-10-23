import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivePresence, Conversation, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

const GHOST_NAMES = new Set([
  '',
  'ipin user',
  'user',
  'anonymous',
  'guest',
  'friend',
  'unknown',
  'unknown user',
  'google user',
  'test user'
]);

/**
 * Strips suffixes like " (Google)" and normalizes whitespace.
 */
export function cleanDisplayName(name?: string): string {
  if (!name) return '';
  return name
    .replace(/\s*\(google\)\s*/gi, '')
    .trim();
}

export function normalizeNameKey(name?: string): string {
  return cleanDisplayName(name).toLowerCase();
}

export function normalizeEmailKey(email?: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Returns true if an email is missing or is a synthetic fallback "@ipin.chat" address
 * (excluding the 4 built-in static demo personas).
 */
export function isSyntheticEmail(email?: string, uid?: string): boolean {
  const clean = normalizeEmailKey(email);
  if (!clean) return true;
  if (uid && uid.startsWith('demo_user_')) return false;
  if (clean === 'guest@ipin.chat') return true;
  return clean.endsWith('@ipin.chat');
}

/**
 * Returns true if a profile is a "Ghost profile" (incomplete, placeholder, or anonymous artifact).
 */
export function isGhostProfile(u?: Partial<UserProfile> | null): boolean {
  if (!u || !u.uid) return true;
  if (u.uid.startsWith('ipin_ai')) return false;
  if (u.uid.startsWith('demo_user_')) return false;

  const rawName = (u.displayName || '').trim().toLowerCase();
  const cleanedName = normalizeNameKey(u.displayName);
  if (!cleanedName || GHOST_NAMES.has(rawName) || GHOST_NAMES.has(cleanedName)) {
    return true;
  }

  const email = normalizeEmailKey(u.email);
  if (email === 'guest@ipin.chat') {
    return true;
  }

  return false;
}

/**
 * Scores a profile so that when 2 identical profiles exist for the same person/email,
 * we always pick the most authentic, complete profile tied to the original email account.
 */
function scoreProfile(u: UserProfile, preferredUid?: string): number {
  let score = 0;

  if (preferredUid && u.uid === preferredUid) {
    score += 40;
  }

  // Strongly prefer real original email accounts (e.g. @gmail.com) over synthetic @ipin.chat
  if (!isSyntheticEmail(u.email, u.uid)) {
    score += 200;
  } else if (u.email) {
    score += 10;
  }

  // Prefer real Firebase Auth UIDs over generated usr_ or google_ prefixes
  if (!u.uid.startsWith('usr_') && !u.uid.startsWith('google_')) {
    score += 80;
  } else if (u.uid.startsWith('usr_')) {
    score += 20;
  }

  // Prefer custom uploaded/chosen photo over generic dicebear bottts
  if (u.photoURL && !u.photoURL.includes('api.dicebear.com')) {
    score += 35;
  }

  // Prefer custom banner over default unsplash placeholder
  if (
    u.bannerURL &&
    !u.bannerURL.includes('photo-1508804185872-d7badad00f7d')
  ) {
    score += 30;
  }

  if (u.note) score += 15;
  if (u.bio && !u.bio.includes('Active on ipin Messenger connecting worldwide!')) {
    score += 15;
  }

  if (u.lastActive) {
    const t = new Date(u.lastActive).getTime();
    if (!isNaN(t)) {
      // Small tie-breaker for most recently active
      score += Math.min(25, Math.max(0, Math.floor((t - 1700000000000) / 100000000)));
    }
  }

  return score;
}

/**
 * Merges a cluster of duplicate UserProfiles representing the same user into
 * ONE canonical profile synced to their 1 original email account.
 */
export function mergeDuplicateProfiles(
  profiles: UserProfile[],
  preferredUid?: string
): { canonical: UserProfile; duplicateUids: string[] } {
  const sorted = [...profiles].sort((a, b) => scoreProfile(b, preferredUid) - scoreProfile(a, preferredUid));
  const primary = sorted[0];

  // Find the best original email (non-synthetic @gmail.com etc. first)
  const bestOriginalEmail =
    sorted.find((p) => !isSyntheticEmail(p.email, p.uid))?.email?.trim().toLowerCase() ||
    sorted.find((p) => Boolean(p.email))?.email?.trim().toLowerCase() ||
    primary.email ||
    '';

  // Find the best display name (without "(Google)")
  const bestDisplayName =
    cleanDisplayName(sorted.find((p) => !isGhostProfile(p))?.displayName) ||
    cleanDisplayName(primary.displayName) ||
    bestOriginalEmail.split('@')[0] ||
    'User';

  // Find best photoURL (prefer custom photo over dicebear fallback)
  const bestPhotoURL =
    sorted.find((p) => p.photoURL && !p.photoURL.includes('api.dicebear.com'))?.photoURL ||
    primary.photoURL ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${primary.uid}`;

  // Find best bannerURL & bannerType
  const bestBannerProfile =
    sorted.find(
      (p) =>
        p.bannerURL &&
        !p.bannerURL.includes('photo-1508804185872-d7badad00f7d')
    ) || primary;

  // Find best bio & location & note
  const bestBio =
    sorted.find(
      (p) =>
        p.bio &&
        !p.bio.includes('Active on ipin Messenger connecting worldwide!') &&
        !p.bio.includes('Connected via Google Account')
    )?.bio ||
    primary.bio ||
    'Active on ipin Messenger connecting worldwide!';

  const bestLocation =
    sorted.find((p) => p.location && p.location !== 'Global Bridge 🌏')?.location ||
    primary.location ||
    'Global Bridge 🌏';

  const noteHolder = sorted.find((p) => Boolean(p.note)) || primary;

  // Determine status: if any of the merged profiles is busy, or online
  const activeStatus =
    sorted.find((p) => p.status === 'busy' || p.status === 'away')?.status === 'busy' ||
    sorted.find((p) => p.status === 'busy' || p.status === 'away')?.status === 'away'
      ? 'busy'
      : sorted.some((p) => p.status === 'online')
      ? 'online'
      : primary.status || 'offline';

  const canonical: UserProfile = {
    ...primary,
    uid: primary.uid,
    displayName: bestDisplayName,
    email: bestOriginalEmail,
    photoURL: bestPhotoURL,
    bannerURL: bestBannerProfile.bannerURL || 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
    bannerType: bestBannerProfile.bannerType || 'image',
    bio: bestBio,
    location: bestLocation,
    note: noteHolder.note,
    noteEmoji: noteHolder.noteEmoji,
    noteUpdatedAt: noteHolder.noteUpdatedAt,
    status: activeStatus
  };

  const duplicateUids = sorted
    .slice(1)
    .map((p) => p.uid)
    .filter((uid) => uid !== canonical.uid);

  return { canonical, duplicateUids };
}

/**
 * Groups and deduplicates a list of UserProfiles so that:
 * 1. All Ghost profiles are removed.
 * 2. Any 2+ profiles sharing the same email OR the same display name are merged into 1 canonical profile
 *    synced to the 1 original email account.
 * 3. If currentUser is provided, any profile belonging to currentUser (by uid, email, or displayName)
 *    is excluded from `otherUsers` so a user never sees a ghost copy of themselves.
 */
export function deduplicateUserProfiles(
  rawUsers: UserProfile[],
  currentUser?: UserProfile | null
): {
  allCanonicalUsers: UserProfile[];
  otherUsers: UserProfile[];
  resolvedCurrentUser: UserProfile | null;
  duplicateUidsToDelete: string[];
  uidRedirectMap: Map<string, string>;
} {
  // 1. Filter out ghost profiles
  const validUsers = rawUsers.filter((u) => !isGhostProfile(u));

  // Include currentUser in clustering so if there is a duplicate of currentUser in rawUsers, they merge!
  const pool: UserProfile[] = [...validUsers];
  if (currentUser && !isGhostProfile(currentUser) && !pool.some((u) => u.uid === currentUser.uid)) {
    pool.push(currentUser);
  }

  // 2. Group profiles that belong to the same person (same email OR same displayName)
  const clusters: UserProfile[][] = [];

  for (const user of pool) {
    const uEmail = normalizeEmailKey(user.email);
    const uName = normalizeNameKey(user.displayName);
    const uEmailLocal = uEmail ? uEmail.split('@')[0] : '';

    // Find all clusters that match this user
    const matchingClusterIndices: number[] = [];
    clusters.forEach((cluster, idx) => {
      const matches = cluster.some((existing) => {
        if (existing.uid === user.uid) return true;
        const eEmail = normalizeEmailKey(existing.email);
        const eName = normalizeNameKey(existing.displayName);
        const eEmailLocal = eEmail ? eEmail.split('@')[0] : '';

        // Exact email match (when email is non-empty)
        if (uEmail && eEmail && uEmail === eEmail) return true;

        // Exact displayName match (case-insensitive, stripped of "(Google)")
        if (uName && eName && uName === eName) return true;

        // Match where one user logged in with username (creating username@ipin.chat) and the other has username@gmail.com
        if (
          uEmailLocal &&
          eEmailLocal &&
          uEmailLocal === eEmailLocal &&
          (isSyntheticEmail(user.email, user.uid) || isSyntheticEmail(existing.email, existing.uid))
        ) {
          return true;
        }

        // Match where displayName equals the email prefix of the other
        if (
          (uName && eEmailLocal && uName === eEmailLocal && isSyntheticEmail(user.email, user.uid)) ||
          (eName && uEmailLocal && eName === uEmailLocal && isSyntheticEmail(existing.email, existing.uid))
        ) {
          return true;
        }

        return false;
      });

      if (matches) {
        matchingClusterIndices.push(idx);
      }
    });

    if (matchingClusterIndices.length === 0) {
      clusters.push([user]);
    } else {
      // Merge all matching clusters + this user into the first matching cluster
      const targetIdx = matchingClusterIndices[0];
      clusters[targetIdx].push(user);
      for (let i = matchingClusterIndices.length - 1; i >= 1; i--) {
        const mergeIdx = matchingClusterIndices[i];
        clusters[targetIdx].push(...clusters[mergeIdx]);
        clusters.splice(mergeIdx, 1);
      }
    }
  }

  const allCanonicalUsers: UserProfile[] = [];
  const duplicateUidsToDelete: string[] = [];
  const uidRedirectMap = new Map<string, string>();
  let resolvedCurrentUser: UserProfile | null = currentUser || null;

  for (const cluster of clusters) {
    // Dedup exact same uid within cluster first
    const byUid = new Map<string, UserProfile>();
    cluster.forEach((u) => {
      const prev = byUid.get(u.uid);
      byUid.set(u.uid, prev ? { ...prev, ...u } : u);
    });
    const distinctProfiles = Array.from(byUid.values());

    // Check if this cluster represents the currentUser
    const isCurrentUserCluster = Boolean(
      currentUser &&
        distinctProfiles.some(
          (p) =>
            p.uid === currentUser.uid ||
            (normalizeEmailKey(currentUser.email) &&
              normalizeEmailKey(p.email) === normalizeEmailKey(currentUser.email)) ||
            (normalizeNameKey(currentUser.displayName) &&
              normalizeNameKey(p.displayName) === normalizeNameKey(currentUser.displayName))
        )
    );

    const { canonical, duplicateUids } = mergeDuplicateProfiles(
      distinctProfiles,
      isCurrentUserCluster ? currentUser?.uid : undefined
    );

    allCanonicalUsers.push(canonical);
    duplicateUids.forEach((dupUid) => {
      if (!dupUid.startsWith('demo_user_')) {
        duplicateUidsToDelete.push(dupUid);
      }
      uidRedirectMap.set(dupUid, canonical.uid);
    });
    uidRedirectMap.set(canonical.uid, canonical.uid);

    if (isCurrentUserCluster) {
      resolvedCurrentUser = canonical;
    }
  }

  // Also collect any raw ghost profile UIDs so they get deleted from Firestore
  rawUsers.forEach((u) => {
    if (u?.uid && isGhostProfile(u) && !u.uid.startsWith('demo_user_')) {
      if (!duplicateUidsToDelete.includes(u.uid)) {
        duplicateUidsToDelete.push(u.uid);
      }
    }
  });

  const currentCanonicalUid = resolvedCurrentUser?.uid || currentUser?.uid;
  const currentCanonicalEmail = normalizeEmailKey(resolvedCurrentUser?.email || currentUser?.email);
  const currentCanonicalName = normalizeNameKey(resolvedCurrentUser?.displayName || currentUser?.displayName);

  const otherUsers = allCanonicalUsers.filter((u) => {
    if (currentCanonicalUid && u.uid === currentCanonicalUid) return false;
    if (currentUser?.uid && u.uid === currentUser.uid) return false;
    if (currentCanonicalEmail && normalizeEmailKey(u.email) === currentCanonicalEmail) return false;
    if (currentCanonicalName && normalizeNameKey(u.displayName) === currentCanonicalName) return false;
    return true;
  });

  return {
    allCanonicalUsers,
    otherUsers,
    resolvedCurrentUser,
    duplicateUidsToDelete,
    uidRedirectMap
  };
}

/**
 * Deduplicates ActivePresence entries so 1 user / 1 email only ever has 1 active presence entry,
 * and ghost presences are filtered out.
 */
export function deduplicateActivePresences(
  presences: ActivePresence[],
  allUsers: UserProfile[] = []
): ActivePresence[] {
  const valid = presences.filter((p) => {
    if (!p || !p.uid) return false;
    const nameKey = normalizeNameKey(p.displayName);
    if (!nameKey || GHOST_NAMES.has(nameKey)) return false;
    if (normalizeEmailKey(p.email) === 'guest@ipin.chat') return false;
    return true;
  });

  const grouped = new Map<string, ActivePresence>();

  valid.forEach((p) => {
    const matchedUser = allUsers.find(
      (u) =>
        u.uid === p.uid ||
        (normalizeEmailKey(u.email) && normalizeEmailKey(u.email) === normalizeEmailKey(p.email)) ||
        (normalizeNameKey(u.displayName) && normalizeNameKey(u.displayName) === normalizeNameKey(p.displayName))
    );

    const canonicalKey =
      matchedUser?.uid ||
      (!isSyntheticEmail(p.email, p.uid) && normalizeEmailKey(p.email)) ||
      normalizeNameKey(p.displayName) ||
      p.uid;

    const existing = grouped.get(canonicalKey);
    const normalizedPresence: ActivePresence = {
      ...p,
      uid: matchedUser?.uid || p.uid,
      displayName: matchedUser?.displayName || cleanDisplayName(p.displayName) || p.displayName,
      email: matchedUser?.email || p.email,
      photoURL: matchedUser?.photoURL || p.photoURL
    };

    if (!existing) {
      grouped.set(canonicalKey, normalizedPresence);
    } else {
      const existingTime = existing.lastActiveMs || new Date(existing.lastActive || 0).getTime() || 0;
      const newTime = p.lastActiveMs || new Date(p.lastActive || 0).getTime() || 0;
      if (newTime >= existingTime) {
        grouped.set(canonicalKey, normalizedPresence);
      }
    }
  });

  return Array.from(grouped.values());
}

/**
 * Scans Firestore `users` and `active_presences`, merges any duplicate profiles into
 * 1 canonical profile with the original email account, and deletes ghost/duplicate docs.
 */
let lastCleanupRunMs = 0;

export async function purgeGhostAndDuplicateProfilesInFirestore(
  currentProfile?: UserProfile | null,
  force: boolean = false
): Promise<UserProfile | null> {
  const now = Date.now();
  if (!force && now - lastCleanupRunMs < 10000) {
    return currentProfile || null;
  }
  lastCleanupRunMs = now;

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const rawUsers: UserProfile[] = [];
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      rawUsers.push({
        ...data,
        uid: data.uid || docSnap.id
      });
    });

    const {
      allCanonicalUsers,
      resolvedCurrentUser,
      duplicateUidsToDelete
    } = deduplicateUserProfiles(rawUsers, currentProfile);

    // 1. Update canonical user docs if their merged email/displayName/fields were enriched
    await Promise.allSettled(
      allCanonicalUsers.map(async (canonical) => {
        if (canonical.uid.startsWith('demo_user_')) return;
        const original = rawUsers.find((r) => r.uid === canonical.uid);
        if (
          !original ||
          original.email !== canonical.email ||
          original.displayName !== canonical.displayName ||
          original.photoURL !== canonical.photoURL ||
          original.bannerURL !== canonical.bannerURL
        ) {
          await setDoc(doc(db, 'users', canonical.uid), canonical, { merge: true });
        }
      })
    );

    // 2. Delete all duplicate and ghost user documents + their active_presences from Firestore
    if (duplicateUidsToDelete.length > 0) {
      await Promise.allSettled(
        duplicateUidsToDelete.flatMap((ghostUid) => [
          deleteDoc(doc(db, 'users', ghostUid)),
          deleteDoc(doc(db, 'active_presences', ghostUid))
        ])
      );
    }

    // 3. Also clean up any orphaned ghost documents in `active_presences`
    try {
      const presencesSnap = await getDocs(collection(db, 'active_presences'));
      const ghostPresenceDeletes: Promise<void>[] = [];
      const validCanonicalUids = new Set([
        ...allCanonicalUsers.map((u) => u.uid),
        ...DEMO_USERS.map((u) => u.uid)
      ]);

      presencesSnap.forEach((pSnap) => {
        const pData = pSnap.data() as ActivePresence;
        const pUid = pData.uid || pSnap.id;
        const pName = normalizeNameKey(pData.displayName);
        if (
          duplicateUidsToDelete.includes(pUid) ||
          !pName ||
          GHOST_NAMES.has(pName) ||
          (!validCanonicalUids.has(pUid) && rawUsers.length > 0)
        ) {
          ghostPresenceDeletes.push(deleteDoc(doc(db, 'active_presences', pSnap.id)));
        }
      });

      if (ghostPresenceDeletes.length > 0) {
        await Promise.allSettled(ghostPresenceDeletes);
      }
    } catch (e) {
      // Silent
    }

    return resolvedCurrentUser;
  } catch (err) {
    return currentProfile || null;
  }
}

/**
 * Deduplicates direct conversations so that if 2 direct conversation documents exist
 * for the same other person (e.g. one with their old duplicate UID and one with their canonical UID),
 * only 1 direct conversation per person is shown.
 */
export function deduplicateConversationsList(
  conversations: Conversation[],
  currentUserId: string,
  allCanonicalUsers: UserProfile[] = [],
  currentUserName?: string
): Conversation[] {
  const result: Conversation[] = [];
  const directByPartnerKey = new Map<string, Conversation>();
  const myNameKey = normalizeNameKey(currentUserName);

  for (const conv of conversations) {
    const isDirect =
      conv.type === 'direct' ||
      conv.id.includes('_dm_') ||
      conv.id.startsWith('dm_');

    if (!isDirect) {
      result.push(conv);
      continue;
    }

    // Identify the other participant
    const otherUid =
      conv.participantIds?.find((id) => id !== currentUserId && id !== 'all-users') ||
      (conv.id.includes('_dm_')
        ? conv.id.split('_dm_').find((id) => id !== currentUserId)
        : undefined);

    const otherParticipantData =
      (otherUid && conv.participantData?.[otherUid]) ||
      (conv.participantData
        ? Object.entries(conv.participantData).find(([uid]) => uid !== currentUserId)?.[1]
        : undefined);

    const rawOtherName =
      otherParticipantData?.displayName ||
      (conv.title && conv.title !== 'Chat' ? conv.title : '');
    const otherNameKey = normalizeNameKey(rawOtherName);

    // Filter out ghost self-chats or chats with ghost "ipin User"
    if (otherNameKey && GHOST_NAMES.has(otherNameKey)) {
      continue;
    }
    if (myNameKey && otherNameKey && otherNameKey === myNameKey) {
      continue;
    }

    // Match against canonical users to unify by canonical person
    const matchedCanonicalUser = allCanonicalUsers.find(
      (u) =>
        (otherUid && u.uid === otherUid) ||
        (otherNameKey && normalizeNameKey(u.displayName) === otherNameKey)
    );

    const partnerKey =
      matchedCanonicalUser?.uid ||
      (matchedCanonicalUser?.email && normalizeEmailKey(matchedCanonicalUser.email)) ||
      otherNameKey ||
      otherUid ||
      conv.id;

    const existing = directByPartnerKey.get(partnerKey);
    if (!existing) {
      directByPartnerKey.set(partnerKey, conv);
    } else {
      // Keep the conversation that has real messages or the most recent activity
      const timeExisting = new Date(existing.lastMessageTime || existing.updatedAt || 0).getTime();
      const timeCurrent = new Date(conv.lastMessageTime || conv.updatedAt || 0).getTime();
      const existingIsDefault = !existing.lastMessageText || existing.lastMessageText === 'Started conversation';
      const currentIsDefault = !conv.lastMessageText || conv.lastMessageText === 'Started conversation';

      if ((existingIsDefault && !currentIsDefault) || timeCurrent > timeExisting) {
        directByPartnerKey.set(partnerKey, conv);
      }
    }
  }

  return [...result, ...Array.from(directByPartnerKey.values())].sort((a, b) => {
    const timeA = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
    const timeB = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });
}
