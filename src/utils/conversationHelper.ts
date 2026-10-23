import { ActivePresence, Conversation, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

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
 * ensuring direct chats ALWAYS show the other user's real name instead of "Chat".
 */
export function getConversationDisplay(
  conversation?: Conversation | null,
  currentUserId?: string,
  allUsers: UserProfile[] = []
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
    // Find the other user's ID
    const otherUid =
      conversation.participantIds?.find((id) => id !== currentUserId && id !== 'all-users') ||
      (conversation.id.startsWith('dm_xiaoai') ? 'ipin_ai_xiaoai' : undefined) ||
      (conversation.id.includes('_dm_')
        ? conversation.id.split('_dm_').find((id) => id !== currentUserId)
        : undefined);

    // Look up in allUsers (from Firebase) or DEMO_USERS by UID first
    let foundUser =
      (otherUid ? allUsers.find((u) => u.uid === otherUid) : null) ||
      (otherUid ? DEMO_USERS.find((u) => u.uid === otherUid) : null);

    // If not found by UID, also check participantData or conversation.title against allUsers by displayName
    if (!foundUser) {
      const candidateName =
        (otherUid && conversation.participantData?.[otherUid]?.displayName) ||
        (conversation.title && conversation.title !== 'Chat' ? conversation.title : '');
      if (candidateName) {
        const lowerCandidate = candidateName.trim().toLowerCase();
        foundUser =
          allUsers.find((u) => u.uid !== currentUserId && (u.displayName || '').trim().toLowerCase() === lowerCandidate) ||
          DEMO_USERS.find((u) => u.uid !== currentUserId && (u.displayName || '').trim().toLowerCase() === lowerCandidate) ||
          null;
      }
    }

    if (foundUser) {
      return {
        title: foundUser.displayName,
        avatar: foundUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${foundUser.uid}`,
        isDirect: true,
        otherUser: foundUser
      };
    }

    // Look up in participantData
    if (otherUid && conversation.participantData?.[otherUid]) {
      const pData = conversation.participantData[otherUid];
      const partialUser: UserProfile = {
        uid: otherUid,
        displayName: pData.displayName || 'Friend',
        email: '',
        photoURL: pData.photoURL,
        location: pData.location
      };
      return {
        title: pData.displayName || 'Friend',
        avatar: pData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUid}`,
        isDirect: true,
        otherUser: partialUser
      };
    }

    // If participantData has another entry whose key !== currentUserId
    if (conversation.participantData) {
      const otherEntry = Object.entries(conversation.participantData).find(([uid]) => uid !== currentUserId);
      if (otherEntry) {
        const [entryUid, pData] = otherEntry;
        const partialUser: UserProfile = {
          uid: entryUid,
          displayName: pData.displayName || conversation.title || 'Friend',
          email: '',
          photoURL: pData.photoURL || conversation.avatar,
          location: pData.location
        };
        return {
          title: partialUser.displayName,
          avatar: partialUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${entryUid}`,
          isDirect: true,
          otherUser: partialUser
        };
      }
    }

    // If conversation.title is valid and not generic "Chat"
    if (conversation.title && conversation.title !== 'Chat') {
      const fallbackUid = otherUid || `user_${conversation.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const fallbackUser: UserProfile = {
        uid: fallbackUid,
        displayName: conversation.title,
        email: '',
        photoURL: conversation.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackUid}`
      };
      return {
        title: conversation.title,
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
