import React, { useState, useEffect } from 'react';
import { Smile, Check, CheckCheck, Languages, Download, Play, FileText, Film, Volume2, Sparkles, Pencil, X, Trash2, CheckSquare, Maximize, Zap, Share2 } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleMessageReaction, editMessage } from '../services/chatService';
import { translateText, translateTextAsync } from '../utils/translator';
import { getMediaBlobUrl, downloadMediaFile } from '../utils/mediaStore';
import { VideoPlayer } from './VideoPlayer';
import { GifPickerModal } from './GifPickerModal';
import { TenorGif } from '../services/tenorService';

interface MessageItemProps {
  message: Message;
  conversationId: string;
  isSelf: boolean;
  showSenderInfo: boolean;
  onPreviewMedia: (media: { url: string; type: string; name?: string; format?: string; size?: number; posterUrl?: string }) => void;
  onSelectUserChat?: (user: UserProfile) => void;
  onOpenUserProfile?: (userId: string, userName?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onForwardMessage?: (message: Message) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onEnterSelectMode?: (messageId: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🇨🇳', '🔥'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  conversationId,
  isSelf,
  showSenderInfo,
  onPreviewMedia,
  onSelectUserChat,
  onOpenUserProfile,
  onDeleteMessage,
  onForwardMessage,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onEnterSelectMode
}) => {
  const { profile } = useAuth();
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showGifReactionPicker, setShowGifReactionPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>(message.reactions || {});
  const [showTranslation, setShowTranslation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [videoPlayError, setVideoPlayError] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    translated: string;
    pinyin?: string;
  } | null>(null);

  useEffect(() => {
    setLocalReactions(message.reactions || {});
  }, [message.reactions]);

  useEffect(() => {
    let active = true;
    const mediaUrl = message.mediaUrl || '';

    if (
      mediaUrl.startsWith('http://') ||
      mediaUrl.startsWith('https://') ||
      mediaUrl.startsWith('data:') ||
      mediaUrl.startsWith('blob:') ||
      mediaUrl.startsWith('/') ||
      mediaUrl.startsWith('./')
    ) {
      setResolvedBlobUrl(mediaUrl);
      return;
    }

    if (
      mediaUrl.startsWith('vid_') ||
      mediaUrl.startsWith('local_media:') ||
      mediaUrl.startsWith('shared_media:')
    ) {
      const key = mediaUrl
        .replace(/^shared_media:/, '')
        .replace(/^local_media:/, '');

      getMediaBlobUrl(key).then((url) => {
        if (active && url) {
          setResolvedBlobUrl(url);
        }
      });

      const handleBlobReady = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (
          detail &&
          (detail.key === key ||
            detail.key === `shared_media:${key}` ||
            detail.key === `local_media:${key}`)
        ) {
          if (active && detail.url) {
            setResolvedBlobUrl(detail.url);
          }
        }
      };

      window.addEventListener('ipin_media_blob_ready', handleBlobReady);
      return () => {
        active = false;
        window.removeEventListener('ipin_media_blob_ready', handleBlobReady);
      };
    }

    setResolvedBlobUrl(null);
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
      {
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName,
        createdAt: message.createdAt,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl
      }
    );
  };

  const handleToggleTranslation = async () => {
    if (!showTranslation) {
      setShowTranslation(true);
      if (!translationResult && message.text) {
        setIsTranslating(true);
        try {
          const res = await translateTextAsync(message.text);
          setTranslationResult({ translated: res.translated, pinyin: res.pinyin });
        } catch {
          const fallback = translateText(message.text);
          setTranslationResult({ translated: fallback.translated, pinyin: fallback.pinyin });
        } finally {
          setIsTranslating(false);
        }
      }
    } else {
      setShowTranslation(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteMessage?.(message.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
  const isBigLike = message.text === '👍' && !isImage && !isVideo && !isAudio;

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
        {/* Multi-select Checkbox */}
        {isSelectMode && isSelf && (
          <button
            type="button"
            onClick={() => onToggleSelect?.(message.id)}
            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mb-1 transition-all border ${
              isSelected
                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-red-400 bg-white dark:bg-zinc-800'
            }`}
            title={isSelected ? 'Deselect message' : 'Select message to delete'}
          >
            {isSelected && <Check size={13} className="stroke-[3]" />}
          </button>
        )}

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

          {/* Delete confirmation popover */}
          {showDeleteConfirm && (
            <div
              className={`absolute -top-11 z-35 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-700 animate-in zoom-in-95 duration-100 ${
                isSelf ? 'right-0' : 'left-0'
              }`}
            >
              <Trash2 size={13} className="text-red-400 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-200 whitespace-nowrap">Delete message?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors shadow-xs"
              >
                {isDeleting ? '...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white text-[11px] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Main Bubble */}
          <div
            className={`relative rounded-3xl overflow-hidden shadow-xs transition-shadow ${
              isBigLike
                ? 'bg-transparent text-zinc-900 dark:text-white shadow-none'
                : isSelf
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
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif';
                  }}
                  className="max-h-72 w-auto object-cover rounded-2xl hover:opacity-95 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-mono uppercase backdrop-blur-xs">
                    {message.fileFormat || 'IMG'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadMediaFile({
                        urlOrKey: message.mediaUrl!,
                        mediaUrl: message.mediaUrl,
                        fileName: message.fileName,
                        fileFormat: message.fileFormat,
                        fileSize: message.fileSize
                      });
                    }}
                    className="p-1 rounded-md bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs transition-all shadow-md cursor-pointer"
                    title={`Download actual ${message.fileFormat?.toUpperCase() || 'image'} file`}
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. PLAYABLE ENCODED VIDEO PLAYER */}
            {isVideo && (
              <div className="rounded-2xl overflow-hidden max-w-sm bg-black relative my-1">
                <VideoPlayer
                  src={resolvedBlobUrl || message.mediaUrl || ''}
                  poster={message.posterUrl || (message.mediaUrl?.startsWith('data:image/') ? message.mediaUrl : undefined)}
                  fileName={message.fileName || 'Encoded_Video.mp4'}
                  fileFormat={message.fileFormat || 'mp4'}
                  fileSize={message.fileSize || 0}
                  maxHeightClass="max-h-72"
                  onDownload={() =>
                    downloadMediaFile({
                      urlOrKey: resolvedBlobUrl || message.mediaUrl || '',
                      mediaUrl: message.mediaUrl,
                      rawKey: message.mediaUrl?.replace(/^shared_media:/, '').replace(/^local_media:/, ''),
                      fileName: message.fileName,
                      fileFormat: message.fileFormat,
                      fileSize: message.fileSize
                    })
                  }
                />
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
              <div className={isBigLike ? 'p-1 select-none' : 'px-4 py-2.5'}>
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
                ) : isBigLike ? (
                  <div className="py-0.5">
                    <span
                      className="text-5xl inline-block hover:scale-125 active:scale-95 transition-transform duration-200 filter drop-shadow-md cursor-pointer animate-in zoom-in-75"
                      role="img"
                      aria-label="Like"
                      title="Sent Like"
                    >
                      👍
                    </span>
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
                    {showTranslation && (
                      <div
                        className={`mt-2 pt-2 border-t text-xs space-y-1 ${
                          isSelf ? 'border-white/20 text-emerald-100' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {isTranslating ? (
                          <div className="flex items-center gap-1.5 py-1 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[11px] font-semibold">Translating message...</span>
                          </div>
                        ) : translationResult ? (
                          <>
                            {translationResult.pinyin && (
                              <p className="font-mono text-[11px] opacity-95">
                                <span className="font-semibold text-emerald-400">Pinyin:</span> {translationResult.pinyin}
                              </p>
                            )}
                            <p className="font-medium">
                              <span className="font-semibold text-emerald-400">Translation:</span> {translationResult.translated}
                            </p>
                          </>
                        ) : null}
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
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif';
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

            {/* Direct "Forward" button */}
            {onForwardMessage && (
              <button
                type="button"
                onClick={() => onForwardMessage(message)}
                className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all shadow-xs cursor-pointer"
                title="Forward message, photo, or video to another user or channel"
              >
                <Share2 size={11} className="text-teal-500" />
                <span className="text-[10px] font-medium">Forward</span>
              </button>
            )}

            {/* Direct "Edit sentence" button for sender's own text messages */}
            {isSelf && message.text && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setEditText(message.text || '');
                }}
                className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all shadow-xs cursor-pointer"
                title="Edit and fix broken sentence"
              >
                <Pencil size={11} className="text-emerald-500" />
                <span className="text-[10px] font-medium">Edit sentence</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Quick Action Row (React, Forward, Edit, Translate) */}
        <div className="opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={() => setShowReactionBar(!showReactionBar)}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-amber-500 transition-colors cursor-pointer"
            title="React with emoji or GIF"
          >
            <Smile size={14} />
          </button>

          {/* Forward Button */}
          {onForwardMessage && (
            <button
              type="button"
              onClick={() => onForwardMessage(message)}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-teal-500 transition-colors cursor-pointer"
              title="Forward message, video, or photo to other users"
            >
              <Share2 size={14} />
            </button>
          )}

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

          {/* Delete Message Trash Icon */}
          {isSelf && onDeleteMessage && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 transition-colors"
              title="Delete message"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Multi-Select Messages Button */}
          {isSelf && onEnterSelectMode && !isSelectMode && (
            <button
              type="button"
              onClick={() => onEnterSelectMode(message.id)}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-emerald-500 transition-colors"
              title="Select multiple messages to delete"
            >
              <CheckSquare size={13} />
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
