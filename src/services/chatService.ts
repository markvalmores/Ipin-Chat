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
  arrayRemove,
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

// Delete a single message
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    // 1. Remove from in-memory sample cache if present
    if (INITIAL_CHANNEL_MESSAGES[conversationId]) {
      INITIAL_CHANNEL_MESSAGES[conversationId] = INITIAL_CHANNEL_MESSAGES[conversationId].filter(
        (m) => m.id !== messageId
      );
    }

    // 2. Delete from Firestore
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (error) {
    console.warn("Could not delete message from Firestore:", error);
  }
}

// Delete multiple messages in batch
export async function deleteMultipleMessages(
  conversationId: string,
  messageIds: string[]
): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;

  try {
    // 1. Remove from in-memory sample cache
    if (INITIAL_CHANNEL_MESSAGES[conversationId]) {
      INITIAL_CHANNEL_MESSAGES[conversationId] = INITIAL_CHANNEL_MESSAGES[conversationId].filter(
        (m) => !messageIds.includes(m.id)
      );
    }

    // 2. Delete all in parallel from Firestore
    await Promise.allSettled(
      messageIds.map((id) =>
        deleteDoc(doc(db, 'conversations', conversationId, 'messages', id))
      )
    );
  } catch (error) {
    console.warn("Could not delete multiple messages from Firestore:", error);
  }
}

// React to a message
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  updatedReactions: Record<string, string>,
  fallbackMessage?: Partial<Message>
): Promise<Record<string, string>> {
  try {
    // 1. Update in-memory initial channel messages so instant feedback persists locally
    if (INITIAL_CHANNEL_MESSAGES[conversationId]) {
      const found = INITIAL_CHANNEL_MESSAGES[conversationId].find((m) => m.id === messageId);
      if (found) {
        found.reactions = updatedReactions;
      }
    }

    // 2. Persist to Firestore with setDoc merge: true so non-existent docs never throw errors
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const dataToSet: Record<string, any> = {
      id: messageId,
      conversationId,
      reactions: updatedReactions,
      updatedAt: new Date().toISOString()
    };
    if (fallbackMessage) {
      if (fallbackMessage.text) dataToSet.text = fallbackMessage.text;
      if (fallbackMessage.senderId) dataToSet.senderId = fallbackMessage.senderId;
      if (fallbackMessage.senderName) dataToSet.senderName = fallbackMessage.senderName;
      if (fallbackMessage.createdAt) dataToSet.createdAt = fallbackMessage.createdAt;
      if (fallbackMessage.mediaType) dataToSet.mediaType = fallbackMessage.mediaType;
      if (fallbackMessage.mediaUrl) dataToSet.mediaUrl = fallbackMessage.mediaUrl;
    }

    await setDoc(msgRef, dataToSet, { merge: true });
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

  const initialMsgs = INITIAL_CHANNEL_MESSAGES[conversationId] || [];

  // Emit initial messages immediately for zero-latency load
  if (initialMsgs.length > 0) {
    onUpdate(initialMsgs);
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const firestoreMsgs: Message[] = [];
    snapshot.forEach((docSnap) => {
      firestoreMsgs.push(docSnap.data() as Message);
    });

    // Merge initial channel messages with Firestore messages by message ID
    // This ensures group chat history is never cleared when someone sends a message or like!
    const map = new Map<string, Message>();
    initialMsgs.forEach((m) => map.set(m.id, { ...m }));
    firestoreMsgs.forEach((m) => {
      const existing = map.get(m.id);
      map.set(m.id, { ...(existing || {}), ...m });
    });

    const combined = Array.from(map.values());
    combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    onUpdate(combined);
  }, (error) => {
    // Fallback to local sample messages if offline or permission
    onUpdate(INITIAL_CHANNEL_MESSAGES[conversationId] || []);
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

// Add members to an existing group chat (like Facebook Messenger)
export async function addMembersToGroupChat(
  conversationId: string,
  newMembersOrIds: (UserProfile | string)[],
  addedBy?: UserProfile | null,
  addMemberCount: number = 0
): Promise<void> {
  const newMemberProfiles: UserProfile[] = [];
  const newMemberIds: string[] = [];

  newMembersOrIds.forEach((item) => {
    if (typeof item === 'string') {
      newMemberIds.push(item);
    } else if (item && item.uid) {
      newMemberProfiles.push(item);
      newMemberIds.push(item.uid);
    }
  });

  const now = new Date().toISOString();

  // 1. Update in-memory initial public channels if it is one of them
  const initialChan = INITIAL_PUBLIC_CHANNELS.find((c) => c.id === conversationId);
  if (initialChan) {
    const merged = Array.from(new Set([...initialChan.participantIds, ...newMemberIds]));
    initialChan.participantIds = merged;
    initialChan.memberCount = Math.min(1000, Math.max(merged.length, (initialChan.memberCount || merged.length) + addMemberCount + (newMemberIds.length > 0 ? newMemberIds.length : 0)));
    initialChan.updatedAt = now;
  }

  // 2. Update local custom group chats
  const localList = getLocalGroupChats();
  const found = localList.find((g) => g.id === conversationId);
  if (found) {
    const merged = Array.from(new Set([...found.participantIds, ...newMemberIds]));
    found.participantIds = merged;
    found.memberCount = Math.min(1000, Math.max(merged.length, (found.memberCount || merged.length) + addMemberCount + (newMemberIds.length > 0 ? newMemberIds.length : 0)));
    found.updatedAt = now;
    if (!found.participantData) found.participantData = {};
    newMemberProfiles.forEach((u) => {
      found.participantData![u.uid] = {
        displayName: u.displayName,
        photoURL: u.photoURL,
        location: u.location
      };
    });
    saveLocalGroupChat(found);
  }

  // 3. Persist to Firestore
  try {
    const convRef = doc(db, 'conversations', conversationId);
    const updates: Record<string, any> = {
      updatedAt: now
    };
    if (newMemberIds.length > 0) {
      updates.participantIds = arrayUnion(...newMemberIds);
    }
    newMemberProfiles.forEach((u) => {
      updates[`participantData.${u.uid}`] = {
        displayName: u.displayName,
        photoURL: u.photoURL || '',
        location: u.location || ''
      };
    });

    await setDoc(convRef, updates, { merge: true });

    // 4. Send Facebook Messenger style system notification message to chat!
    if (newMemberProfiles.length > 0 || newMemberIds.length > 0) {
      const names = newMemberProfiles.length > 0
        ? newMemberProfiles.map((m) => m.displayName).join(', ')
        : `${newMemberIds.length} new member${newMemberIds.length > 1 ? 's' : ''}`;
      const adderName = addedBy?.displayName || 'A member';
      const systemText = `👋 ${adderName} added ${names} to the group.`;

      const systemMsgId = `sys_add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const systemMsg: Message = {
        id: systemMsgId,
        conversationId,
        senderId: 'system-bot',
        senderName: 'ipin Bot 🤖',
        senderPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        text: systemText,
        mediaType: 'none',
        reactions: {},
        readBy: addedBy ? [addedBy.uid] : [],
        createdAt: now
      };

      const msgRef = doc(db, 'conversations', conversationId, 'messages', systemMsgId);
      await setDoc(msgRef, systemMsg);

      await setDoc(
        convRef,
        {
          lastMessageText: systemText,
          lastMessageSender: 'System',
          lastMessageTime: now,
          updatedAt: now
        },
        { merge: true }
      );
    }
  } catch (e) {
    console.warn('Could not update members in Firestore group:', e);
  }

  window.dispatchEvent(new CustomEvent('ipin_group_updated', { detail: { conversationId, newMemberIds } }));
}

// Remove a member from an existing group chat (like Facebook Messenger)
export async function removeMemberFromGroupChat(
  conversationId: string,
  memberId: string,
  memberName: string,
  removedBy?: UserProfile | null
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update in-memory initial public channels if it is one of them
  const initialChan = INITIAL_PUBLIC_CHANNELS.find((c) => c.id === conversationId);
  if (initialChan) {
    initialChan.participantIds = initialChan.participantIds.filter((id) => id !== memberId);
    initialChan.memberCount = Math.max(1, (initialChan.memberCount || 2) - 1);
    initialChan.updatedAt = now;
  }

  // 2. Update local custom group chats
  const localList = getLocalGroupChats();
  const found = localList.find((g) => g.id === conversationId);
  if (found) {
    found.participantIds = found.participantIds.filter((id) => id !== memberId);
    found.memberCount = Math.max(1, (found.memberCount || 2) - 1);
    found.updatedAt = now;
    if (found.participantData && found.participantData[memberId]) {
      delete found.participantData[memberId];
    }
    saveLocalGroupChat(found);
  }

  // 3. Persist to Firestore
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convRef,
      {
        participantIds: arrayRemove(memberId),
        updatedAt: now
      },
      { merge: true }
    );

    // 4. Send Facebook Messenger style notification message to group chat
    const isSelfLeaving = removedBy && removedBy.uid === memberId;
    const systemText = isSelfLeaving
      ? `👋 ${memberName} left the group.`
      : `🚫 ${removedBy?.displayName || 'An admin'} removed ${memberName} from the group.`;

    const systemMsgId = `sys_rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const systemMsg: Message = {
      id: systemMsgId,
      conversationId,
      senderId: 'system-bot',
      senderName: 'ipin Bot 🤖',
      senderPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      text: systemText,
      mediaType: 'none',
      reactions: {},
      readBy: removedBy ? [removedBy.uid] : [],
      createdAt: now
    };

    const msgRef = doc(db, 'conversations', conversationId, 'messages', systemMsgId);
    await setDoc(msgRef, systemMsg);

    await setDoc(
      convRef,
      {
        lastMessageText: systemText,
        lastMessageSender: 'System',
        lastMessageTime: now,
        updatedAt: now
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Could not remove member in Firestore group:', e);
  }

  window.dispatchEvent(
    new CustomEvent('ipin_group_updated', {
      detail: { conversationId, removedMemberId: memberId }
    })
  );
}

// Lookup a group chat by ID, full URL, or invite code
export async function getGroupChatByIdOrInvite(idOrInvite: string): Promise<Conversation | null> {
  if (!idOrInvite) return null;
  let cleanId = idOrInvite.trim();

  // If a full URL is passed, extract query parameter or path segment
  try {
    if (cleanId.includes('?invite=') || cleanId.includes('&invite=')) {
      const match = cleanId.match(/[?&]invite=([^&#]+)/);
      if (match) cleanId = match[1];
    } else if (cleanId.includes('?join=') || cleanId.includes('&join=')) {
      const match = cleanId.match(/[?&]join=([^&#]+)/);
      if (match) cleanId = match[1];
    } else if (cleanId.includes('/gc/')) {
      const parts = cleanId.split('/gc/');
      if (parts[1]) cleanId = parts[1].split(/[?&#]/)[0];
    }
  } catch (e) {
    // Keep cleanId as is
  }

  // 1. Check Initial public channels
  const inPublic = INITIAL_PUBLIC_CHANNELS.find(
    (c) =>
      c.id === cleanId ||
      c.inviteCode === cleanId ||
      (c.inviteCode && c.inviteCode.endsWith(cleanId))
  );
  if (inPublic) return inPublic;

  // 2. Check local custom group chats
  const localList = getLocalGroupChats();
  const inLocal = localList.find(
    (c) =>
      c.id === cleanId ||
      c.inviteCode === cleanId ||
      (c.inviteCode && c.inviteCode.endsWith(cleanId))
  );
  if (inLocal) return inLocal;

  // 3. Fetch from Firestore by document ID
  try {
    const docRef = doc(db, 'conversations', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Conversation;
    }

    // 4. Query Firestore by inviteCode
    const q = query(collection(db, 'conversations'), where('inviteCode', '==', cleanId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return qSnap.docs[0].data() as Conversation;
    }
  } catch (err) {
    console.warn('Error fetching group chat by invite:', err);
  }

  return null;
}

// Background chat wallpaper configuration
export interface ChatWallpaperSettings {
  wallpaperURL?: string;
  wallpaperType?: 'image' | 'gif' | 'youtube' | 'video';
  wallpaperOpacity?: number; // 0.1 to 1.0 (default 0.85)
  wallpaperBlur?: number; // 0, 1, 2, 4
}

export function getConversationWallpaper(
  conversationId: string,
  initialConversation?: Conversation | null
): ChatWallpaperSettings | null {
  try {
    const raw = localStorage.getItem(`ipin_wallpaper_${conversationId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore
  }

  if (initialConversation?.wallpaperURL) {
    return {
      wallpaperURL: initialConversation.wallpaperURL,
      wallpaperType: initialConversation.wallpaperType || 'image',
      wallpaperOpacity: initialConversation.wallpaperOpacity ?? 0.85,
      wallpaperBlur: initialConversation.wallpaperBlur ?? 0
    };
  }

  return null;
}

export async function updateConversationWallpaper(
  conversationId: string,
  settings: ChatWallpaperSettings | null
): Promise<void> {
  const key = `ipin_wallpaper_${conversationId}`;
  if (!settings || !settings.wallpaperURL) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(settings));
  }

  // Update initial channels
  const inPublic = INITIAL_PUBLIC_CHANNELS.find((c) => c.id === conversationId);
  if (inPublic) {
    inPublic.wallpaperURL = settings?.wallpaperURL;
    inPublic.wallpaperType = settings?.wallpaperType;
    inPublic.wallpaperOpacity = settings?.wallpaperOpacity;
    inPublic.wallpaperBlur = settings?.wallpaperBlur;
  }

  // Update local custom group chats
  const localList = getLocalGroupChats();
  const found = localList.find((c) => c.id === conversationId);
  if (found) {
    found.wallpaperURL = settings?.wallpaperURL;
    found.wallpaperType = settings?.wallpaperType;
    found.wallpaperOpacity = settings?.wallpaperOpacity;
    found.wallpaperBlur = settings?.wallpaperBlur;
    saveLocalGroupChat(found);
  }

  // Persist to Firestore
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convRef,
      {
        wallpaperURL: settings?.wallpaperURL || '',
        wallpaperType: settings?.wallpaperType || 'image',
        wallpaperOpacity: settings?.wallpaperOpacity ?? 0.85,
        wallpaperBlur: settings?.wallpaperBlur ?? 0,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update wallpaper in Firestore:', err);
  }

  window.dispatchEvent(
    new CustomEvent('ipin_wallpaper_updated', {
      detail: { conversationId, settings }
    })
  );
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

