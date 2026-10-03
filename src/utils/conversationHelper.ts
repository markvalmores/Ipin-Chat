import { Conversation, UserProfile } from '../types';
import { DEMO_USERS } from '../services/sampleData';

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

    // Look up in allUsers (from Firebase) or DEMO_USERS
    const foundUser =
      (otherUid ? allUsers.find((u) => u.uid === otherUid) : null) ||
      (otherUid ? DEMO_USERS.find((u) => u.uid === otherUid) : null);

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

    // If conversation.title is valid and not generic "Chat"
    if (conversation.title && conversation.title !== 'Chat') {
      return {
        title: conversation.title,
        avatar: conversation.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        isDirect: true
      };
    }

    return {
      title: 'Friend',
      avatar: conversation.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isDirect: true
    };
  }

  // Group or Global Channel
  return {
    title: conversation.title || 'Global Bridge Lounge',
    avatar: conversation.avatar || 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150',
    isDirect: false
  };
}
