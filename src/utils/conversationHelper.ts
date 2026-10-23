import { ActivePresence, Conversation, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';
import { extractNormalizedParticipantData, normalizeEmailKey, normalizeNameKey } from './profileDeduplicator';

export type ResolvedRealtimeStatus = 'online' | 'busy' | 'offline';

/**
 * Resolves a user's exact real-time status from Firebase `active_presences` and `users`:
 * - 'online' -> Green (physically online and status is online)
 * - 'busy'   -> Red / Do Not Disturb (user set status to busy/away while online, or demo user set to busy)
 * - 'offline' -> Gray / Grey (user is physically offline / disconnected, or manually set status to offline)
 */
export function getUserRealtimeStatus(
  targetUser?: UserProfile | null,
  activePresences: ActivePresence[] = [],
  allUsers: UserProfile[] = []
): ResolvedRealtimeStatus {
  if (!targetUser) return 'offline';
  if (targetUser.uid.startsWith('ipin_ai')) return 'online';

  const targetUid = targetUser.uid;
  const targetName = (targetUser.displayName || '').trim().toLowerCase();
  const targetEmail = (targetUser.email || '').trim().toLowerCase();

  const matchesTarget = (uid?: string, name?: string, email?: string): boolean => {
    if (uid && uid === targetUid) return true;
    const cleanName = (name || '').trim().toLowerCase();
    if (
      targetName &&
      cleanName &&
      cleanName === targetName &&
      targetName !== 'friend' &&
      targetName !== 'ipin user' &&
      targetName !== 'user'
    ) {
      return true;
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (targetEmail && cleanEmail && cleanEmail === targetEmail) {
      return true;
    }
    return false;
  };

  // 1. Find live user document from Firestore `users` subscription
  const liveUser = allUsers.find((u) => matchesTarget(u.uid, u.displayName, u.email));

  // 2. Find live heartbeat from Firestore `active_presences` subscription
  const activePresence = activePresences.find((p) =>
    matchesTarget(p.uid, p.displayName, p.email)
  );

  // If user is in activePresences, they have an active real-time heartbeat
  if (activePresence) {
    if (activePresence.isOnline === false || activePresence.status === 'offline') {
      return 'offline';
    }
    if (
      activePresence.status === 'busy' ||
      activePresence.status === 'away' ||
      liveUser?.status === 'busy' ||
      liveUser?.status === 'away'
    ) {
      return 'busy';
    }
    if (liveUser?.status === 'offline') {
      return 'offline';
    }
    return 'online';
  }

  // If user is NOT in activePresences:
  // For real accounts (not built-in static demo personas), absence of an active heartbeat means they are physically offline!
  const isStaticDemo = targetUid.startsWith('demo_user_');
  if (!isStaticDemo) {
    return 'offline';
  }

  // For built-in demo personas, check their live Firestore user doc or fallback demo status
  const demoStatus = liveUser?.status || targetUser.status || 'offline';
  if (demoStatus === 'offline') return 'offline';
  if (demoStatus === 'busy' || demoStatus === 'away') return 'busy';
  return 'online';
}

/**
 * Returns the Tailwind background color class for a status indicator dot:
 * - 'online'  -> Green (bg-emerald-500)
 * - 'busy'    -> Red / Do Not Disturb (bg-red-500)
 * - 'offline' -> Gray / Grey (bg-zinc-400 dark:bg-zinc-500)
 */
export function getStatusDotColor(status: ResolvedRealtimeStatus | string | undefined): string {
  if (status === 'online') return 'bg-emerald-500';
  if (status === 'busy' || status === 'away') return 'bg-red-500';
  return 'bg-zinc-400 dark:bg-zinc-500';
}

/**
 * Returns human-readable status label
 */
export function getStatusLabel(status: ResolvedRealtimeStatus | string | undefined): string {
  if (status === 'online') return 'Online';
  if (status === 'busy' || status === 'away') return 'Busy • Do Not Disturb';
  return 'Offline';
}

/**
 * Checks whether a user is currently online (or busy/active, i.e., not offline).
 */
export function isUserOnline(
  targetUser?: UserProfile | null,
  activePresences: ActivePresence[] = [],
  allUsers: UserProfile[] = []
): boolean {
  const status = getUserRealtimeStatus(targetUser, activePresences, allUsers);
  return status === 'online' || status === 'busy';
}

/**
 * Returns the proper title, avatar, and other user information for a conversation,
 * ensuring direct chats ALWAYS show the other user's real name instead of "Chat" or the current user's own name.
 */
export function getConversationDisplay(
  conversation?: Conversation | null,
  currentUserId?: string,
  allUsers: UserProfile[] = [],
  currentUserName?: string
): {
  title: string;
  avatar: string;
  isDirect: boolean;
  otherUser?: UserProfile;
} {
  if (!conversation) {
    return {
      title: 'ipin Messenger',
      avatar: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150',
      isDirect: false
    };
  }

  const isDirect =
    conversation.type === 'direct' ||
    conversation.id.includes('_dm_') ||
    conversation.id.startsWith('dm_');

  if (isDirect) {
    let resolvedMyName = currentUserName || '';
    let resolvedMyEmail = '';
    if (!resolvedMyName) {
      try {
        const stored = localStorage.getItem('ipin_active_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          resolvedMyName = parsed?.displayName || '';
          resolvedMyEmail = parsed?.email || '';
        }
      } catch (e) {}
    }

    const myNameKey = normalizeNameKey(resolvedMyName);
    const myEmailKey = normalizeEmailKey(resolvedMyEmail);

    const isMe = (uid?: string, name?: string, email?: string): boolean => {
      if (uid && currentUserId && uid === currentUserId) return true;
      const nKey = normalizeNameKey(name);
      if (myNameKey && nKey && nKey === myNameKey) return true;
      const eKey = normalizeEmailKey(email);
      if (myEmailKey && eKey && eKey === myEmailKey) return true;
      return false;
    };

    const pDataMap = extractNormalizedParticipantData(conversation);

    // 1. Find the other participant from participantData (any entry that is NOT me)
    let otherUid: string | undefined;
    let otherPData: { displayName: string; email?: string; photoURL?: string; location?: string } | undefined;

    for (const [uid, pData] of Object.entries(pDataMap)) {
      if (!isMe(uid, pData?.displayName, pData?.email)) {
        otherUid = uid;
        otherPData = pData;
        break;
      }
    }

    // 2. Also check participantIds and _dm_ segments
    if (!otherUid) {
      if (conversation.id.startsWith('dm_xiaoai')) {
        otherUid = 'ipin_ai_xiaoai';
      } else {
        const candidateIds = Array.from(
          new Set([
            ...(conversation.participantIds || []),
            ...(conversation.id.includes('_dm_') ? conversation.id.split('_dm_') : [])
          ])
        ).filter((id) => id && id !== 'all-users');

        for (const id of candidateIds) {
          const matchedUser =
            allUsers.find((u) => u.uid === id) ||
            DEMO_USERS.find((u) => u.uid === id);
          if (!isMe(id, matchedUser?.displayName, matchedUser?.email)) {
            otherUid = id;
            break;
          }
        }
      }
    }

    // 3. Look up in allUsers (from Firebase) or DEMO_USERS by UID first
    let foundUser =
      (otherUid ? allUsers.find((u) => u.uid === otherUid && !isMe(u.uid, u.displayName, u.email)) : null) ||
      (otherUid ? DEMO_USERS.find((u) => u.uid === otherUid && !isMe(u.uid, u.displayName, u.email)) : null);

    // 4. Determine candidate name for the OTHER user (never using conversation.title if it equals MY name!)
    const titleIsNotMe =
      conversation.title &&
      conversation.title !== 'Chat' &&
      (!myNameKey || normalizeNameKey(conversation.title) !== myNameKey);

    const senderIsNotMe =
      conversation.lastMessageSender &&
      conversation.lastMessageSender !== 'System' &&
      (!myNameKey || normalizeNameKey(conversation.lastMessageSender) !== myNameKey);

    const otherNameFromList = (conversation.participantNames || []).find(
      (n) => normalizeNameKey(n) && normalizeNameKey(n) !== myNameKey
    );

    const candidateName =
      otherPData?.displayName ||
      otherNameFromList ||
      (titleIsNotMe ? conversation.title! : '') ||
      (senderIsNotMe ? conversation.lastMessageSender! : '');

    // If not found by UID, check candidateName or email against allUsers
    if (!foundUser && (candidateName || otherPData?.email)) {
      const lowerCandidate = normalizeNameKey(candidateName);
      const lowerEmail = normalizeEmailKey(otherPData?.email);
      foundUser =
        allUsers.find(
          (u) =>
            !isMe(u.uid, u.displayName, u.email) &&
            ((lowerEmail && normalizeEmailKey(u.email) === lowerEmail) ||
              (lowerCandidate && normalizeNameKey(u.displayName) === lowerCandidate))
        ) ||
        DEMO_USERS.find(
          (u) =>
            !isMe(u.uid, u.displayName, u.email) &&
            ((lowerEmail && normalizeEmailKey(u.email) === lowerEmail) ||
              (lowerCandidate && normalizeNameKey(u.displayName) === lowerCandidate))
        ) ||
        null;
    }

    if (foundUser) {
      return {
        title: foundUser.displayName,
        avatar: foundUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${foundUser.uid}`,
        isDirect: true,
        otherUser: foundUser
      };
    }

    if (otherPData && otherPData.displayName) {
      const resolvedUid = otherUid || `user_${normalizeNameKey(otherPData.displayName).replace(/[^a-z0-9]/g, '_')}`;
      const partialUser: UserProfile = {
        uid: resolvedUid,
        displayName: otherPData.displayName,
        email: otherPData.email || '',
        photoURL: otherPData.photoURL,
        location: otherPData.location
      };
      return {
        title: otherPData.displayName,
        avatar: otherPData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${resolvedUid}`,
        isDirect: true,
        otherUser: partialUser
      };
    }

    if (candidateName) {
      const fallbackUid = otherUid || `user_${normalizeNameKey(candidateName).replace(/[^a-z0-9]/g, '_')}`;
      const fallbackUser: UserProfile = {
        uid: fallbackUid,
        displayName: candidateName,
        email: '',
        photoURL: conversation.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackUid}`
      };
      return {
        title: candidateName,
        avatar: fallbackUser.photoURL!,
        isDirect: true,
        otherUser: fallbackUser
      };
    }

    const defaultUid = otherUid || 'unknown_friend';
    return {
      title: 'Friend',
      avatar: conversation.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isDirect: true,
      otherUser: {
        uid: defaultUid,
        displayName: 'Friend',
        email: '',
        photoURL: conversation.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    };
  }

  // Group or Global Channel
  return {
    title: conversation.title || 'Global Bridge Lounge',
    avatar: conversation.avatar || 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150',
    isDirect: false
  };
}
