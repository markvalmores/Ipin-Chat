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

    const updateData: Record<string, any> = {
      id: conversationId,
      lastMessageText: lastPreview,
      lastMessageSender: sender.displayName,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (defaultChannel) {
      updateData.type = defaultChannel.type;
      updateData.title = defaultChannel.title;
      updateData.avatar = defaultChannel.avatar;
    }

    await setDoc(convRef, updateData, { merge: true });

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

// Edit message text (fixes broken sentence)
export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      text: newText.trim(),
      isEdited: true,
      editedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Could not edit message in Firestore:", error);
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

// Local persistent group chats helper
const LOCAL_GROUPCHATS_KEY = 'ipin_local_groupchats_v2';

function getLocalGroupChats(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_GROUPCHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalGroupChat(gc: Conversation) {
  try {
    const list = getLocalGroupChats().filter((g) => g.id !== gc.id);
    list.unshift(gc);
    localStorage.setItem(LOCAL_GROUPCHATS_KEY, JSON.stringify(list));
  } catch (e) {
    // Silent
  }
}

// Subscribe to conversations list
export function subscribeToConversations(
  currentUserId: string,
  onUpdate: (conversations: Conversation[]) => void
) {
  const convsRef = collection(db, 'conversations');

  const emitMerged = (firestoreList: Conversation[] = []) => {
    const localList = getLocalGroupChats();
    const map = new Map<string, Conversation>();

    // 1. Initial public Discord channels
    INITIAL_PUBLIC_CHANNELS.forEach((c) => map.set(c.id, c));

    // 2. Local custom group chats
    localList.forEach((c) => {
      if (c.type === 'group' || (c.participantIds && c.participantIds.includes(currentUserId))) {
        map.set(c.id, { ...(map.get(c.id) || {}), ...c });
      }
    });

    // 3. Firestore conversations
    firestoreList.forEach((c) => {
      if (c.type === 'group' || (c.participantIds && c.participantIds.includes(currentUserId))) {
        map.set(c.id, { ...(map.get(c.id) || {}), ...c });
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    onUpdate(merged);
  };

  // Immediate emit
  emitMerged([]);

  const unsubscribe = onSnapshot(convsRef, (snapshot) => {
    const list: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Conversation;
      list.push(data);
    });
    emitMerged(list);
  }, (error) => {
    emitMerged([]);
  });

  const handleGroupUpdate = () => {
    emitMerged([]);
  };
  window.addEventListener('ipin_group_updated', handleGroupUpdate);

  return () => {
    unsubscribe();
    window.removeEventListener('ipin_group_updated', handleGroupUpdate);
  };
}

// Create a Discord-style Group Chat with 2 to 1,000 members
export async function createGroupChat(
  creator: UserProfile,
  data: {
    title: string;
    description?: string;
    avatar?: string;
    participantIds: string[];
    topic?: string;
    category?: string;
    simulatedTotalMembers?: number;
  }
): Promise<Conversation> {
  const groupId = `gc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Combine creator and selected participants
  const uniqueParticipants = Array.from(new Set([creator.uid, ...data.participantIds]));

  // Calculate member count: min 2, max 1,000
  const chosenMembers = data.simulatedTotalMembers
    ? Math.min(1000, Math.max(2, data.simulatedTotalMembers))
    : Math.min(1000, Math.max(2, uniqueParticipants.length));

  const formattedTitle = data.title.trim().startsWith('#')
    ? data.title.trim()
    : `# ${data.title.trim()}`;

  const newGroup: Conversation = {
    id: groupId,
    type: 'group',
    title: formattedTitle,
    description:
      data.description?.trim() ||
      `Discord-style community channel for ${data.title}. Active with up to 1,000 members.`,
    avatar:
      data.avatar ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.title)}`,
    participantIds: uniqueParticipants,
    participantData: {
      [creator.uid]: {
        displayName: creator.displayName,
        photoURL: creator.photoURL,
        location: creator.location
      }
    },
    creatorId: creator.uid,
    admins: [creator.uid],
    topic: data.topic?.trim() || `Welcome to ${formattedTitle}! Cross-border discussion & bridge.`,
    category: data.category || 'General',
    memberCount: chosenMembers,
    inviteCode: `ipin.chat/gc/${groupId.substring(3, 9)}`,
    lastMessageText: `🎉 ${creator.displayName} created group channel "${formattedTitle}" (${chosenMembers} members)`,
    lastMessageSender: 'System',
    lastMessageTime: now,
    createdAt: now,
    updatedAt: now
  };

  // 1. Save to local storage for immediate zero-latency feedback
  saveLocalGroupChat(newGroup);
  window.dispatchEvent(new CustomEvent('ipin_group_updated', { detail: newGroup }));

  // 2. Persist to Firestore
  try {
    const groupRef = doc(db, 'conversations', groupId);
    await setDoc(groupRef, newGroup);

    // Initial system greeting message in channel
    const welcomeMsg: Message = {
      id: `msg_welcome_${Date.now()}`,
      conversationId: groupId,
      senderId: 'system-bot',
      senderName: 'ipin Bot 🤖',
      senderPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      text: `Welcome to **${formattedTitle}**! 🚀\n\n📌 **Channel Topic:** ${newGroup.topic}\n👥 **Members:** ${chosenMembers} / 1,000 capacity.\n\nEnjoy unlimited photos, videos of any size, animated GIFs, voice and video calls with real-time filters!`,
      createdAt: now,
      reactions: { [creator.uid]: '🎉' },
      readBy: [creator.uid]
    };
    const msgRef = doc(db, 'conversations', groupId, 'messages', welcomeMsg.id);
    await setDoc(msgRef, welcomeMsg);
  } catch (err) {
    console.warn('Could not write group to Firestore:', err);
  }

  return newGroup;
}

// Add members to an existing group chat (up to 1,000 members)
export async function addMembersToGroupChat(
  conversationId: string,
  newMemberIds: string[],
  addMemberCount: number = 0
): Promise<void> {
  const localList = getLocalGroupChats();
  const found = localList.find((g) => g.id === conversationId);
  if (found) {
    const merged = Array.from(new Set([...found.participantIds, ...newMemberIds]));
    found.participantIds = merged;
    found.memberCount = Math.min(
      1000,
      Math.max(merged.length, (found.memberCount || merged.length) + addMemberCount)
    );
    saveLocalGroupChat(found);
    window.dispatchEvent(new CustomEvent('ipin_group_updated'));
  }

  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      participantIds: arrayUnion(...newMemberIds)
    });
  } catch (e) {
    // Silent
  }
}

// Helper for local persistent 24-hour stories
const LOCAL_STORIES_STORAGE_KEY = 'ipin_active_stories_v3';

function getLocalActiveStories(): Story[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORIES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Story[];
    const now = Date.now();
    return list.filter((s) => new Date(s.expiresAt).getTime() > now);
  } catch (e) {
    return [];
  }
}

function saveLocalActiveStory(story: Story) {
  try {
    const existing = getLocalActiveStories().filter((s) => s.id !== story.id);
    existing.unshift(story);
    localStorage.setItem(LOCAL_STORIES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    // Silent
  }
}

function removeLocalActiveStory(storyId: string) {
  try {
    const existing = getLocalActiveStories().filter((s) => s.id !== storyId);
    localStorage.setItem(LOCAL_STORIES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    // Silent
  }
}

// Subscribe to active stories (strictly within 24-hour lifespan)
export function subscribeToStories(
  onUpdate: (stories: Story[]) => void
) {
  const storiesRef = collection(db, 'stories');

  const emitMergedStories = (firestoreStories: Story[] = []) => {
    const now = Date.now();
    const activeFirestore = firestoreStories.filter(
      (s) => new Date(s.expiresAt).getTime() > now
    );

    const localStories = getLocalActiveStories();

    // Map initial demo stories to be freshly within the last few hours
    const freshDemoStories = INITIAL_STORIES.map((s, idx) => ({
      ...s,
      createdAt: new Date(now - 1000 * 60 * 60 * (idx * 2 + 1)).toISOString(),
      expiresAt: new Date(now + 1000 * 60 * 60 * (24 - (idx * 2 + 1))).toISOString()
    }));

    // Merge: Firestore first, then local cache, then demo stories
    const mergedMap = new Map<string, Story>();

    freshDemoStories.forEach((s) => mergedMap.set(s.id, s));
    localStories.forEach((s) => mergedMap.set(s.id, s));
    activeFirestore.forEach((s) => mergedMap.set(s.id, s));

    const finalStories = Array.from(mergedMap.values());
    finalStories.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    onUpdate(finalStories);
  };

  // Immediate emit from local cache & demo
  emitMergedStories([]);

  const unsubscribe = onSnapshot(storiesRef, (snapshot) => {
    const list: Story[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Story;
      list.push(data);
    });
    emitMergedStories(list);
  }, (error) => {
    console.warn("Could not subscribe to Firestore stories:", error);
    emitMergedStories([]);
  });

  // Re-check periodically or on custom event
  const handleStoryUpdate = () => {
    emitMergedStories([]);
  };
  window.addEventListener('ipin_story_updated', handleStoryUpdate);

  return () => {
    unsubscribe();
    window.removeEventListener('ipin_story_updated', handleStoryUpdate);
  };
}

// Create a new story active for exactly 24 hours
export async function createStory(
  user: UserProfile,
  storyData: {
    mediaUrl?: string;
    mediaType: 'image' | 'video' | 'text';
    text?: string;
    bgColor?: string;
  }
): Promise<string> {
  const storyId = `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Exactly 24 hours

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

  // 1. Immediately store in local 24h cache for instant availability
  saveLocalActiveStory(newStory);
  window.dispatchEvent(new CustomEvent('ipin_story_updated'));

  // 2. Persist to Firestore
  try {
    const storyRef = doc(db, 'stories', storyId);
    await setDoc(storyRef, newStory);
  } catch (error) {
    console.warn("Could not write story to Firestore:", error);
  }

  return storyId;
}

// Delete an active story
export async function deleteStory(storyId: string): Promise<void> {
  removeLocalActiveStory(storyId);
  window.dispatchEvent(new CustomEvent('ipin_story_updated'));

  try {
    const storyRef = doc(db, 'stories', storyId);
    await deleteDoc(storyRef);
  } catch (error) {
    console.warn("Could not delete story from Firestore:", error);
  }
}

// Mark story as viewed
export async function markStoryViewed(storyId: string, userId: string) {
  // Update in local cache
  try {
    const local = getLocalActiveStories();
    const found = local.find((s) => s.id === storyId);
    if (found && !found.viewers.includes(userId)) {
      found.viewers.push(userId);
      localStorage.setItem(LOCAL_STORIES_STORAGE_KEY, JSON.stringify(local));
    }
  } catch (e) {
    // Silent
  }

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

