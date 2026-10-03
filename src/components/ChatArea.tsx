import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  Info,
  Clock,
  Globe,
  ShieldCheck,
  Languages,
  ChevronLeft,
  Users,
  Sparkles
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToMessages,
  sendMessage,
  markMessageRead,
  subscribeToAllUsers
} from '../services/chatService';
import { getConversationDisplay } from '../utils/conversationHelper';
import { DEMO_USERS } from '../services/sampleData';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { MediaPreviewModal } from './MediaPreviewModal';
import { UserProfileModal } from './UserProfileModal';
import { TranslatorModal } from './TranslatorModal';

interface ChatAreaProps {
  conversation: Conversation | null;
  onBackToSidebar?: () => void;
  onSelectUserChat?: (user: UserProfile) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onBackToSidebar,
  onSelectUserChat
}) => {
  const { profile, activePresences } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [currentTimeBeijing, setCurrentTimeBeijing] = useState('');
  const [currentTimeNY, setCurrentTimeNY] = useState('');
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTranslatorModalOpen, setIsTranslatorModalOpen] = useState(false);
  const [insertedText, setInsertedText] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: string;
    name?: string;
    format?: string;
    size?: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to all users in Firebase to enrich profiles and usernames
  useEffect(() => {
    const unsub = subscribeToAllUsers(profile?.uid || '', (users: UserProfile[]) => {
      if (users.length > 0) setAllUsers(users);
    });
    return () => unsub();
  }, [profile?.uid]);

  // Dual Time Clocks (Beijing CST UTC+8 and New York EST)
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      // Beijing Time (Asia/Shanghai)
      const beijingTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Shanghai',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      // New York Time (America/New_York)
      const nyTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setCurrentTimeBeijing(beijingTimeStr);
      setCurrentTimeNY(nyTimeStr);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 10000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time messages for active conversation
  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = subscribeToMessages(conversation.id, (loaded) => {
      setMessages(loaded);

      // Auto mark unread as read
      if (profile) {
        loaded.forEach((m) => {
          if (!m.readBy?.includes(profile.uid)) {
            markMessageRead(conversation.id, m.id, profile.uid);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [conversation?.id, profile?.uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-400 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 text-2xl shadow-inner">
          🟢
        </div>
        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
          Welcome to ipin Messenger Web App
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
          Cross-border social interactions between China and the world without restrictions. Select a conversation or global bridge channel to start chatting freely.
        </p>
      </div>
    );
  }

  const handleSendMessage = async (data: {
    text?: string;
    mediaUrl?: string;
    mediaType?: Message['mediaType'];
    fileName?: string;
    fileSize?: number;
    fileFormat?: string;
  }) => {
    if (!profile) return;
    await sendMessage(conversation.id, profile, data);
  };

  const displayInfo = getConversationDisplay(conversation, profile?.uid, allUsers);
  const otherUser = displayInfo.otherUser;
  const isOtherUserOnline = otherUser ? activePresences.some((p) => p.uid === otherUser.uid && p.isOnline) : true;

  const handleOpenHeaderProfile = () => {
    if (otherUser) {
      setInspectedUser(otherUser);
      setIsProfileModalOpen(true);
    }
  };

  const handleOpenUserProfileFromId = (userId: string, userName?: string) => {
    const found = allUsers.find((u) => u.uid === userId) || DEMO_USERS.find((u) => u.uid === userId);
    if (found) {
      setInspectedUser(found);
    } else {
      setInspectedUser({
        uid: userId,
        displayName: userName || 'Friend',
        email: '',
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`
      });
    }
    setIsProfileModalOpen(true);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* 1. Active Chat Header */}
      <div className="p-3 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
        <div
          onClick={handleOpenHeaderProfile}
          className={`flex items-center gap-3 min-w-0 ${otherUser ? 'cursor-pointer group' : ''}`}
          title={otherUser ? `Click to view ${displayInfo.title}'s profile, banner & status` : displayInfo.title}
        >
          {/* Back button on mobile */}
          {onBackToSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBackToSidebar();
              }}
              className="p-1.5 -ml-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Avatar with online pulse */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
              <img
                src={displayInfo.avatar}
                alt={displayInfo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                isOtherUserOnline ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {displayInfo.title}
              </h2>
              {otherUser && (
                <span className="text-[10px] text-zinc-400 group-hover:text-emerald-500 transition-colors font-medium">
                  (view profile)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
              {isOtherUserOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Now
                </span>
              ) : (
                <span className="flex items-center gap-1 text-zinc-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  Offline
                </span>
              )}
              <span>•</span>
              {/* Dual timezone indicator */}
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                <Clock size={11} />
                🇨🇳 Beijing {currentTimeBeijing || '11:00 AM'} | 🇺🇸 NY {currentTimeNY || '10:00 PM'}
              </span>
            </div>
          </div>
        </div>

        {/* Messenger Action Icons */}
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          {/* Dedicated Chinese ⇄ English Translator Button */}
          <button
            type="button"
            onClick={() => setIsTranslatorModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/20 transition-all shadow-xs"
            title="Open Chinese ⇄ English Translator"
          >
            <Languages size={15} />
            <span className="hidden sm:inline text-[11px]">Translate</span>
          </button>

          <button
            type="button"
            className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="Start voice bridge"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="Start video bridge"
          >
            <Video size={18} />
          </button>
          {otherUser && (
            <button
              type="button"
              onClick={handleOpenHeaderProfile}
              className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              title="View full profile & banner"
            >
              <Info size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Messages List Scroll Container */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1">
        {/* Top Channel Welcome Card */}
        <div className="my-6 p-6 mx-auto max-w-md rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-emerald-500/20 text-center shadow-xs">
          <div
            onClick={handleOpenHeaderProfile}
            className={`w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden ring-2 ring-emerald-500/30 ${
              otherUser ? 'cursor-pointer hover:scale-105 transition-transform' : ''
            }`}
          >
            <img
              src={displayInfo.avatar}
              alt={displayInfo.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {displayInfo.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {conversation.description || `Direct encrypted communication on ipin Messenger.`}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
            <ShieldCheck size={13} />
            Unrestricted Cross-Border Route Active
          </div>
        </div>

        {/* Message Items */}
        {messages.map((msg, index) => {
          const isSelf = profile?.uid === msg.senderId;
          const prevMsg = messages[index - 1];
          const showSenderInfo = conversation.type === 'group' && (!prevMsg || prevMsg.senderId !== msg.senderId);

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              conversationId={conversation.id}
              isSelf={isSelf}
              showSenderInfo={showSenderInfo}
              onPreviewMedia={(media) => setSelectedMedia(media)}
              onSelectUserChat={onSelectUserChat}
              onOpenUserProfile={handleOpenUserProfileFromId}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input bar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        externalText={insertedText}
        onClearExternalText={() => setInsertedText(null)}
        onOpenTranslator={() => setIsTranslatorModalOpen(true)}
      />

      {/* 4. Fullscreen Lightbox / Media Viewer */}
      {selectedMedia && (
        <MediaPreviewModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.type}
          fileName={selectedMedia.name}
          fileFormat={selectedMedia.format}
          fileSize={selectedMedia.size}
        />
      )}

      {/* 5. User Profile & Banner Inspection Modal */}
      <UserProfileModal
        user={inspectedUser}
        isOpen={isProfileModalOpen}
        isOnline={
          inspectedUser ? activePresences.some((p) => p.uid === inspectedUser.uid && p.isOnline) : false
        }
        onClose={() => setIsProfileModalOpen(false)}
        onStartChat={(u) => {
          onSelectUserChat?.(u);
          setIsProfileModalOpen(false);
        }}
      />

      {/* 6. Chinese ⇄ English Translator Modal */}
      <TranslatorModal
        isOpen={isTranslatorModalOpen}
        onClose={() => setIsTranslatorModalOpen(false)}
        onInsertIntoChat={(text) => {
          setInsertedText(text);
          setIsTranslatorModalOpen(false);
        }}
      />
    </div>
  );
};
