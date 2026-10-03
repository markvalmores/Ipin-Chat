import React, { useState, useEffect } from 'react';
import { Smile, Check, CheckCheck, Languages, Download, Play, FileText, Film, Volume2, Sparkles, Pencil, X } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleMessageReaction, editMessage } from '../services/chatService';
import { translateText } from '../utils/translator';
import { getMediaBlobUrl } from '../utils/mediaStore';
import { GifPickerModal } from './GifPickerModal';
import { TenorGif } from '../services/tenorService';

interface MessageItemProps {
  message: Message;
  conversationId: string;
  isSelf: boolean;
  showSenderInfo: boolean;
  onPreviewMedia: (media: { url: string; type: string; name?: string; format?: string; size?: number }) => void;
  onSelectUserChat?: (user: UserProfile) => void;
  onOpenUserProfile?: (userId: string, userName?: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🇨🇳', '🔥'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  conversationId,
  isSelf,
  showSenderInfo,
  onPreviewMedia,
  onSelectUserChat,
  onOpenUserProfile
}) => {
  const { profile } = useAuth();
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showGifReactionPicker, setShowGifReactionPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>(message.reactions || {});
  const [showTranslation, setShowTranslation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [translationResult, setTranslationResult] = useState<{
    translated: string;
    pinyin?: string;
  } | null>(null);

  useEffect(() => {
    setLocalReactions(message.reactions || {});
  }, [message.reactions]);

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

  const handleReactionClick = async (reactionValue: string) => {
    if (!profile) return;
    const current = { ...localReactions };
    if (current[profile.uid] === reactionValue) {
      delete current[profile.uid];
    } else {
      current[profile.uid] = reactionValue;
    }
    setLocalReactions(current);
    setShowReactionBar(false);
    setShowGifReactionPicker(false);

    await toggleMessageReaction(
      conversationId,
      message.id,
      current,
      profile.uid,
      reactionValue
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

  // Group reactions by emoji or GIF URL and count
  const reactionCounts: Record<string, { count: number; users: string[] }> = {};
  if (localReactions) {
    Object.entries(localReactions).forEach(([uid, val]) => {
      if (!reactionCounts[val]) {
        reactionCounts[val] = { count: 0, users: [] };
      }
      reactionCounts[val].count += 1;
      reactionCounts[val].users.push(uid);
    });
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await editMessage(conversationId, message.id, editText.trim());
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

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
          <button
            type="button"
            onClick={() => onOpenUserProfile?.(message.senderId, message.senderName)}
            className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 hover:underline cursor-pointer"
          >
            {message.senderName}
          </button>
          <span className="text-[10px] text-zinc-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
        {/* Recipient Avatar */}
        {!isSelf && (
          <div
            onClick={() => onOpenUserProfile?.(message.senderId, message.senderName)}
            className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-1 ring-1 ring-zinc-200 dark:ring-zinc-700 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
            title={`View ${message.senderName}'s Profile & Banner`}
          >
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
                const isSelected = profile && localReactions[profile.uid] === emoji;
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

              {/* Tenor GIF Reaction Button */}
              <button
                type="button"
                onClick={() => {
                  setShowReactionBar(false);
                  setShowGifReactionPicker(true);
                }}
                className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-600 dark:text-teal-400 font-mono text-[10px] font-black transition-colors"
                title="React with Tenor GIF"
              >
                GIF
              </button>
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif';
                  }}
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
                {isEditing ? (
                  <div className="space-y-2 py-1 min-w-[220px] sm:min-w-[300px]">
                    <div className="flex items-center justify-between text-[11px] text-emerald-200">
                      <span className="font-semibold flex items-center gap-1">
                        <Pencil size={11} />
                        Fix broken sentence or typo
                      </span>
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl bg-black/40 text-white border border-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder-zinc-300"
                      rows={2}
                      autoFocus
                      placeholder="Type your corrected sentence..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          setIsEditing(false);
                        }
                      }}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editText.trim()}
                        className="px-3.5 py-1 text-[11px] rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save & Fix'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                      {message.text}
                      {message.isEdited && (
                        <span className="text-[10px] opacity-75 ml-1.5 font-medium italic">
                          (edited)
                        </span>
                      )}
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
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reactions Tallies and Direct Action Buttons below bubble */}
          <div
            className={`flex items-center gap-1.5 mt-1.5 flex-wrap ${
              isSelf ? 'justify-end' : 'justify-start'
            }`}
          >
            {Object.entries(reactionCounts).map(([reactionKey, data]) => {
              const hasMyReaction = profile && data.users.includes(profile.uid);
              const isGifReaction = reactionKey.startsWith('http') || reactionKey.startsWith('data:');

              return (
                <button
                  key={reactionKey}
                  type="button"
                  onClick={() => handleReactionClick(reactionKey)}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-xs border transition-all active:scale-95 ${
                    hasMyReaction
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400'
                  }`}
                  title={hasMyReaction ? 'Click to remove reaction' : 'Click to add reaction'}
                >
                  {isGifReaction ? (
                    <img
                      src={reactionKey}
                      alt="GIF reaction"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif';
                      }}
                      className="w-6 h-6 rounded-md object-cover inline-block"
                      loading="lazy"
                    />
                  ) : (
                    <span>{reactionKey}</span>
                  )}
                  <span className="text-[10px] font-bold">{data.count}</span>
                </button>
              );
            })}

            {/* Direct "+ React" Button */}
            <button
              type="button"
              onClick={() => setShowReactionBar(!showReactionBar)}
              className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all shadow-xs"
              title="React to this message"
            >
              <Smile size={12} className="text-amber-500" />
              <span className="text-[10px] font-medium">React</span>
            </button>

            {/* Direct "Edit sentence" button for sender's own text messages */}
            {isSelf && message.text && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setEditText(message.text || '');
                }}
                className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all shadow-xs"
                title="Edit and fix broken sentence"
              >
                <Pencil size={11} className="text-emerald-500" />
                <span className="text-[10px] font-medium">Edit sentence</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Quick Action Row (React, Edit, Translate) */}
        <div className="opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={() => setShowReactionBar(!showReactionBar)}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-amber-500 transition-colors"
            title="React with emoji or GIF"
          >
            <Smile size={14} />
          </button>

          {isSelf && message.text && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditText(message.text || '');
              }}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-emerald-500 transition-colors"
              title="Edit sentence (fix typos or broken sentence)"
            >
              <Pencil size={13} />
            </button>
          )}

          {message.text && (
            <button
              type="button"
              onClick={handleToggleTranslation}
              className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${
                showTranslation ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-teal-500'
              }`}
              title="Translate & Pinyin"
            >
              <Languages size={14} />
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

      {/* Tenor GIF Reaction Modal */}
      <GifPickerModal
        isOpen={showGifReactionPicker}
        onClose={() => setShowGifReactionPicker(false)}
        onSelectGif={(gif) => handleReactionClick(gif.url)}
        title="React with Tenor GIF"
      />
    </div>
  );
};
