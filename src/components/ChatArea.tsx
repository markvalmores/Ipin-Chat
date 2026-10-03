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
  Users
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToMessages,
  sendMessage,
  markMessageRead
} from '../services/chatService';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { MediaPreviewModal } from './MediaPreviewModal';

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
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTimeBeijing, setCurrentTimeBeijing] = useState('');
  const [currentTimeNY, setCurrentTimeNY] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: string;
    name?: string;
    format?: string;
    size?: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* 1. Active Chat Header */}
      <div className="p-3 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="p-1.5 -ml-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Avatar with online pulse */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
              <img
                src={conversation.avatar || 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150'}
                alt={conversation.title}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {conversation.title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Now
              </span>
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
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
          <button
            type="button"
            className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="Conversation details"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* 2. Messages List Scroll Container */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1">
        {/* Top Channel Welcome Card */}
        <div className="my-6 p-6 mx-auto max-w-md rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-emerald-500/20 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden ring-2 ring-emerald-500/30">
            <img
              src={conversation.avatar || 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150'}
              alt={conversation.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {conversation.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {conversation.description || 'Welcome to this direct encrypted channel on ipin Messenger.'}
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
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input bar */}
      <MessageInput onSendMessage={handleSendMessage} />

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
    </div>
  );
};
