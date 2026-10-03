import React, { useState, useEffect } from 'react';
import { Smile, Check, CheckCheck, Languages, Download, Play, FileText, Film, Volume2, Sparkles } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleMessageReaction } from '../services/chatService';
import { translateText } from '../utils/translator';
import { getMediaBlobUrl } from '../utils/mediaStore';

interface MessageItemProps {
  message: Message;
  conversationId: string;
  isSelf: boolean;
  showSenderInfo: boolean;
  onPreviewMedia: (media: { url: string; type: string; name?: string; format?: string; size?: number }) => void;
  onSelectUserChat?: (user: UserProfile) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🇨🇳', '🔥'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  conversationId,
  isSelf,
  showSenderInfo,
  onPreviewMedia,
  onSelectUserChat
}) => {
  const { profile } = useAuth();
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [translationResult, setTranslationResult] = useState<{
    translated: string;
    pinyin?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (message.mediaUrl?.startsWith('vid_') || message.mediaUrl?.startsWith('local_media:')) {
      const key = message.mediaUrl.replace('local_media:', '');
      getMediaBlobUrl(key).then((url) => {
        if (active && url) {
          setResolvedBlobUrl(url);
        }
      });
    } else {
      setResolvedBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [message.mediaUrl]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReactionClick = async (emoji: string) => {
    if (!profile) return;
    setShowReactionBar(false);
    await toggleMessageReaction(
      conversationId,
      message.id,
      message.reactions,
      profile.uid,
      emoji
    );
  };

  const handleToggleTranslation = () => {
    if (!showTranslation) {
      if (!translationResult && message.text) {
        const res = translateText(message.text);
        setTranslationResult({ translated: res.translated, pinyin: res.pinyin });
      }
      setShowTranslation(true);
    } else {
      setShowTranslation(false);
    }
  };

  // Group reactions by emoji and count
  const reactionCounts: Record<string, { count: number; users: string[] }> = {};
  if (message.reactions) {
    Object.entries(message.reactions).forEach(([uid, emoji]) => {
      if (!reactionCounts[emoji]) {
        reactionCounts[emoji] = { count: 0, users: [] };
      }
      reactionCounts[emoji].count += 1;
      reactionCounts[emoji].users.push(uid);
    });
  }

  const isVideo = message.mediaType === 'video' || ['mp4', 'webm', 'mov'].includes((message.fileFormat || '').toLowerCase());
  const isLegacyVideo = ['avi', 'flv', 'swf', 'wmv'].includes((message.fileFormat || '').toLowerCase());
  const isImage = message.mediaType === 'image' || ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'apng', 'webp'].includes((message.fileFormat || '').toLowerCase());
  const isAudio = message.mediaType === 'audio';

  return (
    <div
      className={`group relative flex flex-col my-1 px-4 ${
        isSelf ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => setShowReactionBar(false)}
    >
      {/* Sender name for group channels */}
      {showSenderInfo && !isSelf && (
        <div className="flex items-center gap-1.5 mb-1 ml-9">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            {message.senderName}
          </span>
          <span className="text-[10px] text-zinc-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
        {/* Recipient Avatar */}
        {!isSelf && (
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-1 ring-1 ring-zinc-200 dark:ring-zinc-700">
            <img
              src={message.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.senderId}`}
              alt={message.senderName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="relative">
          {/* Reaction Bar Floating Popup */}
          {showReactionBar && (
            <div
              className={`absolute -top-10 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 animate-in zoom-in-90 duration-150 ${
                isSelf ? 'right-0' : 'left-0'
              }`}
            >
              {QUICK_REACTIONS.map((emoji) => {
                const isSelected = profile && message.reactions?.[profile.uid] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReactionClick(emoji)}
                    className={`w-7 h-7 rounded-full text-base flex items-center justify-center hover:scale-125 transition-transform ${
                      isSelected ? 'bg-emerald-100 dark:bg-emerald-950/60 scale-110' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Bubble */}
          <div
            className={`relative rounded-3xl overflow-hidden shadow-xs transition-shadow ${
              isSelf
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-zinc-200/50 dark:border-zinc-700/50'
            }`}
          >
            {/* 1. PHOTO PREVIEW (PNG, GIF, JPG, BMP, APNG) */}
            {isImage && message.mediaUrl && (
              <div
                className="cursor-pointer overflow-hidden group/img relative"
                onClick={() =>
                  onPreviewMedia({
                    url: message.mediaUrl!,
                    type: 'image',
                    name: message.fileName,
                    format: message.fileFormat,
                    size: message.fileSize
                  })
                }
              >
                <img
                  src={message.mediaUrl}
                  alt={message.fileName || 'Photo'}
                  className="max-h-72 w-auto object-cover rounded-2xl hover:opacity-95 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-mono uppercase backdrop-blur-xs">
                  {message.fileFormat || 'IMG'}
                </div>
              </div>
            )}

            {/* 2. PLAYABLE VIDEO (MP4, WebM) */}
            {isVideo && !isLegacyVideo && message.mediaUrl && (
              <div className="rounded-2xl overflow-hidden max-w-sm bg-black relative">
                <video
                  src={resolvedBlobUrl || message.mediaUrl}
                  controls
                  playsInline
                  className="max-h-72 w-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-mono uppercase backdrop-blur-xs">
                  {message.fileFormat?.toUpperCase() || 'MP4'}
                </div>
              </div>
            )}

            {/* 3. LEGACY / EXTENDED VIDEO CARD (AVI, FLV, SWF) */}
            {isLegacyVideo && (
              <div
                className={`p-3.5 flex items-center gap-3 cursor-pointer rounded-2xl ${
                  isSelf ? 'bg-emerald-700/40' : 'bg-zinc-200/60 dark:bg-zinc-700/40'
                }`}
                onClick={() =>
                  onPreviewMedia({
                    url: resolvedBlobUrl || message.mediaUrl || '',
                    type: 'video',
                    name: message.fileName,
                    format: message.fileFormat,
                    size: message.fileSize
                  })
                }
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Film size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{message.fileName || 'Video File'}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-80">
                    <span className="font-mono uppercase font-bold text-emerald-400">{message.fileFormat}</span>
                    <span>•</span>
                    <span>{formatFileSize(message.fileSize)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  title="Download / Play"
                >
                  <Download size={14} />
                </button>
              </div>
            )}

            {/* 4. AUDIO / VOICE NOTE */}
            {isAudio && message.mediaUrl && (
              <div className="p-3 flex items-center gap-3 min-w-[200px]">
                <audio src={message.mediaUrl} controls className="h-8 w-full" />
              </div>
            )}

            {/* 5. TEXT CONTENT */}
            {message.text && (
              <div className="px-4 py-2.5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                  {message.text}
                </p>

                {/* Translation & Pinyin display */}
                {showTranslation && translationResult && (
                  <div
                    className={`mt-2 pt-2 border-t text-xs space-y-1 ${
                      isSelf ? 'border-white/20 text-emerald-100' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {translationResult.pinyin && (
                      <p className="font-mono text-[11px] opacity-90">
                        <span className="font-semibold text-emerald-400">Pinyin:</span> {translationResult.pinyin}
                      </p>
                    )}
                    <p className="font-medium italic">
                      <span className="font-semibold text-emerald-400">Translation:</span> {translationResult.translated}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reactions Tallies below bubble */}
          {Object.keys(reactionCounts).length > 0 && (
            <div
              className={`flex items-center gap-1 mt-1 flex-wrap ${
                isSelf ? 'justify-end' : 'justify-start'
              }`}
            >
              {Object.entries(reactionCounts).map(([emoji, data]) => {
                const hasMyReaction = profile && data.users.includes(profile.uid);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReactionClick(emoji)}
                    className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-xs border transition-all ${
                      hasMyReaction
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] font-medium">{data.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover Action Buttons: React, Translate */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={() => setShowReactionBar(!showReactionBar)}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            title="React"
          >
            <Smile size={15} />
          </button>

          {message.text && (
            <button
              type="button"
              onClick={handleToggleTranslation}
              className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${
                showTranslation ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Translate & Pinyin"
            >
              <Languages size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Read receipt / Sent timestamp */}
      {isSelf && (
        <div className="flex items-center gap-1 mt-0.5 mr-1 text-[10px] text-zinc-400">
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.readBy && message.readBy.length > 1 ? (
            <span className="flex items-center text-emerald-500 font-medium gap-0.5">
              <CheckCheck size={13} strokeWidth={2.5} />
              <span>Seen</span>
            </span>
          ) : (
            <Check size={12} strokeWidth={2} />
          )}
        </div>
      )}
    </div>
  );
};
