import React, { useState } from 'react';
import {
  Share2,
  Send,
  Search,
  Check,
  X,
  Film,
  Image as ImageIcon,
  FileText,
  Users,
  MessageSquare,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { sendMessage, getOrCreateDirectConversation } from '../services/chatService';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: Message | null;
  conversations: Conversation[];
  allUsers: UserProfile[];
  onForwardDone?: (targetNames: string[]) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  conversations,
  allUsers,
  onForwardDone
}) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [extraNote, setExtraNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState<string | null>(null);

  if (!isOpen || !messageToForward || !profile) return null;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const title = c.title || c.lastMessageSender || c.id;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter users who don't already have an active conversation displayed
  const filteredUsers = allUsers.filter((u) => {
    if (u.uid === profile.uid) return false;
    const name = u.displayName || u.email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleTargetSelect = (id: string) => {
    if (selectedTargetIds.includes(id)) {
      setSelectedTargetIds(selectedTargetIds.filter((tId) => tId !== id));
    } else {
      setSelectedTargetIds([...selectedTargetIds, id]);
    }
  };

  const handleSendForward = async () => {
    if (selectedTargetIds.length === 0 || isSending) return;
    setIsSending(true);
    setForwardSuccess(null);

    const forwardedNames: string[] = [];

    try {
      for (const targetId of selectedTargetIds) {
        let finalConvId = targetId;
        let convTitle = '';

        // Check if targetId is a user UID or conversation ID
        const targetUser = allUsers.find((u) => u.uid === targetId);
        const existingConv = conversations.find((c) => c.id === targetId);

        if (existingConv) {
          finalConvId = existingConv.id;
          convTitle = existingConv.title || 'Chat';
        } else if (targetUser) {
          const newConv = await getOrCreateDirectConversation(profile, targetUser);
          finalConvId = newConv.id;
          convTitle = targetUser.displayName;
        }

        forwardedNames.push(convTitle || 'Chat');

        // Form payload for forwarding
        let forwardText = messageToForward.text || '';
        if (extraNote.trim()) {
          forwardText = forwardText
            ? `${extraNote.trim()}\n\n--- Forwarded Message ---\n${forwardText}`
            : extraNote.trim();
        }

        await sendMessage(finalConvId, profile, {
          text: forwardText,
          mediaUrl: messageToForward.mediaUrl,
          posterUrl: messageToForward.posterUrl,
          mediaType: messageToForward.mediaType,
          fileName: messageToForward.fileName,
          fileSize: messageToForward.fileSize,
          fileFormat: messageToForward.fileFormat
        });
      }

      setForwardSuccess(`Successfully forwarded to ${forwardedNames.length} chat${forwardedNames.length > 1 ? 's' : ''}! 🚀`);
      onForwardDone?.(forwardedNames);

      setTimeout(() => {
        setIsSending(false);
        setForwardSuccess(null);
        setSelectedTargetIds([]);
        setExtraNote('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to forward message:', err);
      setIsSending(false);
    }
  };

  const mediaType = messageToForward.mediaType || 'none';
  const isVideo = mediaType === 'video' || ['mp4', 'webm', 'mov'].includes((messageToForward.fileFormat || '').toLowerCase());
  const isImage = mediaType === 'image' || ['png', 'gif', 'jpg', 'jpeg', 'webp'].includes((messageToForward.fileFormat || '').toLowerCase());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Forward Message
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Share video, photo, or text to users or group channels
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Item Preview Box */}
        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-500/20 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center border border-emerald-500/30">
            {isImage && (messageToForward.mediaUrl || messageToForward.posterUrl) ? (
              <img
                src={messageToForward.posterUrl || messageToForward.mediaUrl}
                alt="Media thumbnail"
                className="w-full h-full object-cover"
              />
            ) : isVideo ? (
              messageToForward.posterUrl ? (
                <img src={messageToForward.posterUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
              ) : (
                <Film size={20} className="text-emerald-400" />
              )
            ) : (
              <FileText size={20} className="text-emerald-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              <span>{isVideo ? '📹 Video' : isImage ? '🖼️ Photo' : '💬 Text Message'}</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-normal truncate">From {messageToForward.senderName}</span>
            </div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
              {messageToForward.text || messageToForward.fileName || (isVideo ? 'Video Clip' : 'Attachment')}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people or channels..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Targets List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {/* Active Conversations */}
          {filteredConversations.length > 0 && (
            <div className="py-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Recent Conversations & Channels
              </div>
              {filteredConversations.map((conv) => {
                const isSelected = selectedTargetIds.includes(conv.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => toggleTargetSelect(conv.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-500/40'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-600/20 shrink-0 border border-emerald-500/20">
                        {conv.avatar ? (
                          <img src={conv.avatar} alt={conv.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-emerald-400">
                            {conv.type === 'group' ? '#' : '💬'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {conv.title || 'Channel'}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {conv.type === 'group' ? 'Group Channel' : 'Direct Message'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      {isSelected && <Check size={13} className="stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct Users */}
          {filteredUsers.length > 0 && (
            <div className="py-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Registered Contacts
              </div>
              {filteredUsers.map((user) => {
                const isSelected = selectedTargetIds.includes(user.uid);
                return (
                  <div
                    key={user.uid}
                    onClick={() => toggleTargetSelect(user.uid)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-500/40'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                        <img
                          src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {user.displayName}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate">{user.location || user.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      {isSelected && <Check size={13} className="stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Optional Extra Note Input */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-2">
          <input
            type="text"
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            placeholder="Add an optional comment or note..."
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {forwardSuccess ? (
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md animate-in fade-in">
              <Sparkles size={16} />
              <span>{forwardSuccess}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400 font-medium">
                {selectedTargetIds.length === 0
                  ? 'Select chats above'
                  : `${selectedTargetIds.length} recipient${selectedTargetIds.length > 1 ? 's' : ''} selected`}
              </span>

              <button
                type="button"
                onClick={handleSendForward}
                disabled={selectedTargetIds.length === 0 || isSending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                {isSending ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Send size={14} />
                )}
                <span>{isSending ? 'Forwarding...' : 'Forward Now'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
