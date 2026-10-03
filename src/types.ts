export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bannerURL?: string;
  bannerType?: 'image' | 'video' | 'youtube';
  status?: 'online' | 'offline' | 'away';
  note?: string;
  noteEmoji?: string;
  noteUpdatedAt?: string;
  location?: string;
  bio?: string;
  createdAt?: string;
  lastSeen?: string;
}

export interface ActivePresence {
  uid: string;
  displayName: string;
  photoURL?: string;
  lastActive: string;
  isOnline: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  title?: string;
  description?: string;
  avatar?: string;
  participantIds: string[];
  participantData?: Record<string, {
    displayName: string;
    photoURL?: string;
    location?: string;
  }>;
  lastMessageText?: string;
  lastMessageSender?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  createdAt?: string;
  unreadCount?: number;
  creatorId?: string;
  topic?: string;
  category?: string;
  admins?: string[];
  memberCount?: number;
  inviteCode?: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'file' | 'none';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  fileName?: string;
  fileSize?: number;
  fileFormat?: string; // png, gif, jpg, bmp, apng, mp4, avi, flv, swf, etc.
  reactions?: Record<string, string>; // uid -> emoji (e.g. '❤️', '👍')
  readBy?: string[]; // array of userIds
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  translatedText?: string;
  pinyinText?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  text?: string;
  bgColor?: string;
  viewers: string[];
  createdAt: string;
  expiresAt: string;
}

export interface UserNote {
  uid: string;
  displayName: string;
  photoURL?: string;
  note: string;
  emoji: string;
  updatedAt: string;
}
