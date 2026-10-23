import { ActivePresence, Conversation, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

/**
 * Checks whether a user is currently online using activePresences (by UID, displayName, or email)
 * as well as live user document status in Firestore.
 */
export function isUserOnline(
  targetUser?: UserProfile | null,
  activePresences: ActivePresence[] = [],
  allUsers: UserProfile[] = []
): boolean {
  if (!targetUser) return false;
  if (targetUser.uid.startsWith('ipin_ai')) return true;

  const targetUid = targetUser.uid;
  const targetName = (targetUser.displayName || '').trim().toLowerCase();
  const targetEmail = (targetUser.email || '').trim().toLowerCase();

  // 1. Check activePresences by UID, displayName, or email
  const inPresence = activePresences.some((p) => {
    if (p.isOnline === false) return false;
    if (p.uid === targetUid) return true;
    const pName = (p.displayName || '').trim().toLowerCase();
    if (targetName && pName && pName === targetName && targetName !== 'friend' && targetName !== 'ipin user') {
      return true;
    }
    const pEmail = (p.email || '').trim().toLowerCase();
    if (targetEmail && pEmail && pEmail === targetEmail) {
      return true;
    }
    return false;
  });

  if (inPresence) return true;

  // 2. Check allUsers live status from Firestore
  const inUsersOnline = allUsers.some((u) => {
    const sameId = u.uid === targetUid;
    const uName = (u.displayName || '').trim().toLowerCase();
    const sameName = targetName && uName && uName === targetName && targetName !== 'friend' && targetName !== 'ipin user';
    const uEmail = (u.email || '').trim().toLowerCase();
    const sameEmail = targetEmail && uEmail && uEmail === targetEmail;

    if (!sameId && !sameName && !sameEmail) return false;
    return u.status === 'online';
  });

  if (inUsersOnline) return true;

  return targetUser.status === 'online';
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
