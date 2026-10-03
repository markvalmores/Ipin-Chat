import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Conversation, Message, Story, UserProfile } from '../types';
import { INITIAL_CHANNEL_MESSAGES, INITIAL_PUBLIC_CHANNELS, INITIAL_STORIES, DEMO_USERS } from './sampleData';
import { generateXiaoAiReply, AI_PERSONA } from './aiPersonaService';
import { storeMediaBlob } from '../utils/mediaStore';

// Send a new message
export async function sendMessage(
  conversationId: string,
  sender: UserProfile,
  data: {
    text?: string;
    mediaUrl?: string;
    mediaType?: Message['mediaType'];
    fileName?: string;
    fileSize?: number;
    fileFormat?: string;
  }
): Promise<string> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const messageData: Message = {
    id: messageId,
    conversationId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    text: data.text || '',
    mediaUrl: data.mediaUrl || '',
    mediaType: data.mediaType || 'none',
    fileName: data.fileName || '',
    fileSize: data.fileSize || 0,
    fileFormat: data.fileFormat || '',
    reactions: {},
    readBy: [sender.uid],
    createdAt: new Date().toISOString()
  };

  try {
    // 1. Ensure parent conversation document is present in Firestore
    const convRef = doc(db, 'conversations', conversationId);
    const lastPreview = data.mediaType && data.mediaType !== 'none'
      ? `[${data.fileFormat?.toUpperCase() || data.mediaType.toUpperCase()}] ${data.text || data.fileName || 'Media Attachment'}`
      : (data.text || 'Message');

    const defaultChannel = INITIAL_PUBLIC_CHANNELS.find(c => c.id === conversationId);

    await setDoc(convRef, {
      id: conversationId,
      type: defaultChannel?.type || (conversationId.includes('_dm_') || conversationId.startsWith('dm_') ? 'direct' : 'group'),
      title: defaultChannel?.title || 'Chat',
      avatar: defaultChannel?.avatar || '',
      lastMessageText: lastPreview,
      lastMessageSender: sender.displayName,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Save message to subcollection
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(msgRef, messageData);

    // 3. Trigger Xiao Ai Human-like AI reply if chatting with Xiao Ai or mentioned
    const isDirectWithAi = conversationId === 'dm_xiaoai_ai' || conversationId.includes('xiaoai');
    const isAiMentioned = (data.text || '').toLowerCase().includes('@xiaoai') || (data.text || '').toLowerCase().includes('@ai');

    if ((isDirectWithAi || isAiMentioned) && sender.uid !== AI_PERSONA.uid) {
      setTimeout(async () => {
        try {
          const replyText = await generateXiaoAiReply({
            userMessage: data.text || '',
            senderName: sender.displayName,
            hasImage: data.mediaType === 'image',
            hasVideo: data.mediaType === 'video',
            imagePosterDataUrl: data.mediaType === 'image' ? data.mediaUrl : undefined
          });

          const aiMsgId = `ai-msg-${Date.now()}`;
          const aiMessageData: Message = {
            id: aiMsgId,
            conversationId,
            senderId: AI_PERSONA.uid,
            senderName: AI_PERSONA.displayName,
            senderPhoto: AI_PERSONA.photoURL,
            text: replyText,
            mediaType: 'none',
            reactions: { [sender.uid]: '❤️' },
            readBy: [AI_PERSONA.uid],
            createdAt: new Date().toISOString()
          };

          const aiDocRef = doc(db, 'conversations', conversationId, 'messages', aiMsgId);
          await setDoc(aiDocRef, aiMessageData);

          await setDoc(convRef, {
            lastMessageText: replyText,
            lastMessageSender: AI_PERSONA.displayName,
            lastMessageTime: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (aiErr) {
          console.warn("Could not post AI response:", aiErr);
        }
      }, 1400); // 1.4s realistic human typing delay
    }

    return messageId;
  } catch (error) {
    console.error("Error saving message to Firestore:", error);
    return messageId;
  }
}

// React to a message
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  currentReactions: Record<string, string> | undefined,
  userId: string,
  emoji: string
) {
  const updatedReactions = { ...(currentReactions || {}) };
  if (updatedReactions[userId] === emoji) {
    delete updatedReactions[userId];
  } else {
    updatedReactions[userId] = emoji;
  }

  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      reactions: updatedReactions
    });
  } catch (error) {
    console.warn("Could not update reaction in Firestore:", error);
  }
  return updatedReactions;
}

// Mark message as read (Read receipts)
export async function markMessageRead(
  conversationId: string,
  messageId: string,
  userId: string
) {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    // Silent
  }
}

// Subscribe to messages in a conversation
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void
) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    snapshot.forEach((docSnap) => {
      msgs.push(docSnap.data() as Message);
    });

    // If Firestore has no messages yet for this initial channel, seed with rich initial samples
    if (msgs.length === 0 && INITIAL_CHANNEL_MESSAGES[conversationId]) {
      onUpdate(INITIAL_CHANNEL_MESSAGES[conversationId]);
    } else {
      onUpdate(msgs);
    }
  }, (error) => {
    // Fallback to local sample messages if permission or offline
    if (INITIAL_CHANNEL_MESSAGES[conversationId]) {
      onUpdate(INITIAL_CHANNEL_MESSAGES[conversationId]);
    } else {
      onUpdate([]);
    }
  });

  return unsubscribe;
}

// Subscribe to conversations list
export function subscribeToConversations(
  currentUserId: string,
  onUpdate: (conversations: Conversation[]) => void
) {
  const convsRef = collection(db, 'conversations');

  const unsubscribe = onSnapshot(convsRef, (snapshot) => {
    const list: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Conversation;
      // Include if it's group bridge or user is a participant
      if (data.type === 'group' || (data.participantIds && data.participantIds.includes(currentUserId))) {
        list.push(data);
      }
    });

    // Merge with predefined public channels if not existing in Firestore
    const merged = [...INITIAL_PUBLIC_CHANNELS];
    list.forEach(c => {
      const idx = merged.findIndex(m => m.id === c.id);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...c };
      } else {
        merged.push(c);
      }
    });

    // Sort by latest message
    merged.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    onUpdate(merged);
  }, (error) => {
    onUpdate(INITIAL_PUBLIC_CHANNELS);
  });

  return unsubscribe;
}

// Subscribe to active stories
export function subscribeToStories(
  onUpdate: (stories: Story[]) => void
) {
  const storiesRef = collection(db, 'stories');

  const unsubscribe = onSnapshot(storiesRef, (snapshot) => {
    const list: Story[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Story;
      // Check 24 hour expiry
      if (new Date(data.expiresAt).getTime() > Date.now()) {
        list.push(data);
      }
    });

    // Combine with initial sample stories
    const combined = [...list];
    INITIAL_STORIES.forEach(sample => {
      if (!combined.some(s => s.id === sample.id)) {
        combined.push(sample);
      }
    });

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(combined);
  }, (error) => {
    onUpdate(INITIAL_STORIES);
  });

  return unsubscribe;
}

// Create a new story
export async function createStory(
  user: UserProfile,
  storyData: {
    mediaUrl?: string;
    mediaType: 'image' | 'video' | 'text';
    text?: string;
    bgColor?: string;
  }
): Promise<string> {
  const storyId = `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const newStory: Story = {
    id: storyId,
    userId: user.uid,
    userName: user.displayName,
    userPhoto: user.photoURL,
    mediaUrl: storyData.mediaUrl || '',
    mediaType: storyData.mediaType,
    text: storyData.text || '',
    bgColor: storyData.bgColor || 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    viewers: [],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  try {
    const storyRef = doc(db, 'stories', storyId);
    await setDoc(storyRef, newStory);
  } catch (error) {
    console.warn("Could not write story to Firestore:", error);
  }
  return storyId;
}

// Mark story as viewed
export async function markStoryViewed(storyId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, {
      viewers: arrayUnion(userId)
    });
  } catch (error) {
    // Silent
  }
}

// Create or get direct conversation between 2 users
export async function getOrCreateDirectConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<Conversation> {
  const directId = [currentUser.uid, otherUser.uid].sort().join('_dm_');
  const convRef = doc(db, 'conversations', directId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      return snap.data() as Conversation;
    }

    const newConv: Conversation = {
      id: directId,
      type: 'direct',
      title: otherUser.displayName,
      avatar: otherUser.photoURL,
      participantIds: [currentUser.uid, otherUser.uid],
      participantData: {
        [currentUser.uid]: {
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          location: currentUser.location
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          photoURL: otherUser.photoURL,
          location: otherUser.location
        }
      },
      lastMessageText: 'Started conversation',
      lastMessageSender: currentUser.displayName,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await setDoc(convRef, newConv);

    // Also seed a friendly initial message into the subcollection
    const initMsgRef = doc(db, 'conversations', directId, 'messages', `init-${Date.now()}`);
    await setDoc(initMsgRef, {
      id: `init-${Date.now()}`,
      conversationId: directId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderPhoto: currentUser.photoURL,
      text: `👋 Started a direct chat on ipin Messenger!`,
      mediaType: 'none',
      reactions: {},
      readBy: [currentUser.uid],
      createdAt: new Date().toISOString()
    });

    return newConv;
  } catch (err) {
    return {
      id: directId,
      type: 'direct',
      title: otherUser.displayName,
      avatar: otherUser.photoURL,
      participantIds: [currentUser.uid, otherUser.uid],
      lastMessageText: 'Direct conversation',
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

// Search users in Firestore by account name or email
export async function searchUsersByName(queryText: string, currentUserId: string): Promise<UserProfile[]> {
  const q = queryText.toLowerCase().trim();
  const usersRef = collection(db, 'users');

  try {
    const snapshot = await getDocs(usersRef);
    const firestoreUsers: UserProfile[] = [];

    snapshot.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (u.uid !== currentUserId) {
        firestoreUsers.push(u);
      }
    });

    // Merge with DEMO_USERS so test accounts are always discoverable
    const all = [...firestoreUsers];
    DEMO_USERS.forEach((demo) => {
      if (demo.uid !== currentUserId && !all.some((u) => u.uid === demo.uid)) {
        all.push(demo);
      }
    });

    if (!q) return all;

    return all.filter((u) => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const location = (u.location || '').toLowerCase();
      return name.includes(q) || email.includes(q) || location.includes(q);
    });
  } catch (error) {
    console.warn("Could not query users from Firestore, using local list:", error);
    return DEMO_USERS.filter((u) => {
      if (u.uid === currentUserId) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }
}

// Real-time listener for all registered users in Firestore
export function subscribeToAllUsers(
  currentUserId: string,
  onUpdate: (users: UserProfile[]) => void
) {
  const usersRef = collection(db, 'users');

  const unsubscribe = onSnapshot(usersRef, (snapshot) => {
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (u.uid !== currentUserId) {
        list.push(u);
      }
    });

    // Merge with demo users if not present
    const combined = [...list];
    DEMO_USERS.forEach((demo) => {
      if (demo.uid !== currentUserId && !combined.some((u) => u.uid === demo.uid)) {
        combined.push(demo);
      }
    });

    onUpdate(combined);
  }, (error) => {
    onUpdate(DEMO_USERS.filter((u) => u.uid !== currentUserId));
  });

  return unsubscribe;
}

