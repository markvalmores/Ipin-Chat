import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  FilePlus,
  Smile,
  Mic,
  Send,
  ThumbsUp,
  X,
  Languages,
  Film,
  Sparkles,
  Square,
  Zap,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { translateText, translateTextAsync } from '../utils/translator';
import { compressImageForUpload, captureVideoPoster, storeMediaBlob, storeSharedMediaToCloud } from '../utils/mediaStore';
import { GifPickerModal } from './GifPickerModal';
import { TenorGif } from '../services/tenorService';

interface MessageInputProps {
  onSendMessage: (data: {
    text?: string;
    mediaUrl?: string;
    posterUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'file' | 'none';
    fileName?: string;
    fileSize?: number;
    fileFormat?: string;
  }) => Promise<void>;
  placeholder?: string;
  externalText?: string | null;
  onClearExternalText?: () => void;
  onOpenTranslator?: () => void;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡', '🇨🇳', '🗽', '🍵', '🔥', '🎉', '👏', '🙏', '💯', '✨', '🍜', '🚀', '💻'];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  placeholder = 'Type a message in English or Chinese...',
  externalText,
  onClearExternalText,
  onOpenTranslator
}) => {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'video' | 'audio' | 'file';
    format: string;
    size: number;
    name: string;
  } | null>(null);

  const handleSelectTenorGif = async (gif: TenorGif) => {
    setShowGifPicker(false);
    await onSendMessage({
      text: '',
      mediaUrl: gif.url,
      mediaType: 'image',
      fileName: `${gif.title}.gif`,
      fileFormat: 'gif'
    });
  };

  useEffect(() => {
    if (externalText) {
      setText((prev) => (prev ? `${prev} ${externalText}` : externalText));
      onClearExternalText?.();
    }
  }, [externalText]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mediaType: 'image' | 'video' | 'audio' | 'file' = 'file';

    if (['png', 'gif', 'jpg', 'jpeg', 'bmp', 'apng', 'webp'].includes(ext) || file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (['mp4', 'avi', 'flv', 'swf', 'webm', 'mov', 'mkv'].includes(ext) || file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || file.type.startsWith('audio/')) {
      mediaType = 'audio';
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedFile({
      file,
      previewUrl,
      type: mediaType,
      format: ext || 'file',
      size: file.size,
      name: file.name
    });

    // Reset input so same file can be picked again if desired
    e.target.value = '';
  };

  // Voice memo recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setSelectedFile({
          file: new File([audioBlob], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' }),
          previewUrl: audioUrl,
          type: 'audio',
          format: 'webm',
          size: audioBlob.size,
          name: `Voice Memo (${recordingSeconds}s)`
        });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or unavailable:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setSelectedFile(null);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sending
  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);

    const textToSend = text.trim();
    const fileToSend = selectedFile;

    // Clear input fields immediately for instant responsive feel
    setText('');
    setSelectedFile(null);
    setShowEmojiPicker(false);

    try {
      if (!textToSend && !fileToSend) {
        // Messenger / WeChat thumbs up Like
        await onSendMessage({
          text: '👍',
          mediaType: 'none'
        });
        return;
      }

      let finalMessageText = textToSend;

      // Auto-translate if turned on
      if (autoTranslate && finalMessageText) {
        try {
          const translated = await translateTextAsync(finalMessageText);
          if (translated.pinyin) {
            finalMessageText = `${finalMessageText}\n[Pinyin: ${translated.pinyin}] (${translated.translated})`;
          } else {
            finalMessageText = `${finalMessageText} (${translated.translated})`;
          }
        } catch {
          const translated = translateText(finalMessageText);
          if (translated.pinyin) {
            finalMessageText = `${finalMessageText}\n[Pinyin: ${translated.pinyin}] (${translated.translated})`;
          } else {
            finalMessageText = `${finalMessageText} (${translated.translated})`;
          }
        }
      }

      if (fileToSend) {
        let finalMediaUrl = '';
        let posterUrl: string | undefined = undefined;

        if (fileToSend.type === 'image') {
          // Store exact original image file (PNG, JPG, GIF, WebP) via cloud chunks or data URL
          const mediaKey = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          finalMediaUrl = await storeSharedMediaToCloud(mediaKey, fileToSend.file, {
            fileName: fileToSend.name,
            fileFormat: fileToSend.format,
            fileSize: fileToSend.file.size
          });
        } else if (fileToSend.type === 'video') {
          // Extract poster thumbnail frame with safe 1000ms max timeout
          const posterPromise = Promise.race([
            captureVideoPoster(fileToSend.file),
            new Promise<string>((r) => setTimeout(() => r(''), 1000))
          ]);
          posterUrl = (await posterPromise) || undefined;

          const mediaKey = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          // Store exact original video file (MP4, WebM, MOV, etc.) into cloud chunks + local IndexedDB
          finalMediaUrl = await storeSharedMediaToCloud(mediaKey, fileToSend.file, {
            fileName: fileToSend.name,
            fileFormat: fileToSend.format || 'mp4',
            fileSize: fileToSend.file.size
          });
        } else {
          // Audio, Document, or File attachment
          const mediaKey = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          finalMediaUrl = await storeSharedMediaToCloud(mediaKey, fileToSend.file, {
            fileName: fileToSend.name,
            fileFormat: fileToSend.format,
            fileSize: fileToSend.file.size
          });
        }

        await onSendMessage({
          text: finalMessageText,
          mediaUrl: finalMediaUrl,
          posterUrl: posterUrl,
          mediaType: fileToSend.type,
          fileName: fileToSend.name,
          fileSize: fileToSend.size,
          fileFormat: fileToSend.format
        });
      } else {
        await onSendMessage({
          text: finalMessageText,
          mediaType: 'none'
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="relative border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 sm:px-4 py-2 sm:py-2.5 w-full max-w-full overflow-hidden">
      {/* File preview banner before sending - truncated to prevent overflow */}
      {selectedFile && (
        <div className="mb-2 p-2 sm:p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-emerald-500/30 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-150 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            {selectedFile.type === 'image' && (
              <img
                src={selectedFile.previewUrl}
                alt="Upload preview"
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 shrink-0"
              />
            )}
            {selectedFile.type === 'video' && (
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Film size={20} />
              </div>
            )}
            {selectedFile.type === 'audio' && (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Mic size={20} />
              </div>
            )}
            {selectedFile.type === 'file' && (
              <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-mono text-xs font-bold uppercase shrink-0">
                {selectedFile.format}
              </div>
            )}

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
                {selectedFile.name}
              </p>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 truncate">
                <span className="uppercase text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{selectedFile.format}</span>
                <span>•</span>
                <span className="shrink-0">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                <span className="text-emerald-500 font-medium ml-0.5 shrink-0">Ready</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Recording in progress overlay */}
      {isRecording && (
        <div className="mb-2 p-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-500 animate-pulse w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-xs font-semibold truncate">Recording: {formatSeconds(recordingSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="text-xs px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white font-medium flex items-center gap-1"
            >
              <Square size={11} fill="currentColor" />
              <span>Attach</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-2 sm:left-4 z-30 p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 w-64 sm:w-72 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-700 text-xs font-semibold text-zinc-500">
            <span>Quick Emojis</span>
            <button onClick={() => setShowEmojiPicker(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2 text-xl">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input controls container - Guaranteed fit on every mobile screen */}
      <div className="flex items-center gap-1 sm:gap-2 w-full max-w-full overflow-hidden">
        {/* Hidden unified file input supporting PNG, GIF, JPG, BMP, APNG, MP4, AVI, FLV, SWF, any file! */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/gif,image/jpeg,image/bmp,image/apng,image/*,video/mp4,video/x-msvideo,video/x-flv,video/*,application/x-shockwave-flash,audio/*,.avi,.flv,.swf,.mp4,.png,.gif,.jpg,.bmp,.apng"
          className="hidden"
        />

        {/* Media / Photo / Video upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 transition-colors shrink-0"
          title="Send photo (PNG, GIF, JPG, BMP, APNG) or video (MP4, AVI, FLV, SWF)"
        >
          <ImageIcon size={19} />
        </button>

        {/* Tenor GIF Search & Send */}
        <button
          type="button"
          onClick={() => setShowGifPicker(true)}
          className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs border border-teal-500/20 transition-all flex items-center gap-0.5 shadow-xs shrink-0"
          title="Search & Send Tenor GIFs"
        >
          <Sparkles size={11} className="text-teal-500" />
          <span>GIF</span>
        </button>

        {/* Voice Note Button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-1.5 sm:p-2 rounded-full transition-colors shrink-0 ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
          title="Record voice memo"
        >
          <Mic size={19} />
        </button>

        {/* Main Text Input Field */}
        <div className="flex-1 min-w-0 relative flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full px-2.5 sm:px-3 py-1 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none py-0.5 truncate"
          />

          {/* Quick Auto-Translate / Pinyin helper toggle inside input */}
          <button
            type="button"
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`p-1 rounded-md text-xs font-semibold flex items-center gap-0.5 transition-colors mr-0.5 shrink-0 ${
              autoTranslate
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-emerald-500'
            }`}
            title="Auto-translate message with Pinyin & Chinese"
          >
            <Languages size={13} />
            <span className="hidden md:inline text-[10px]">Pinyin</span>
          </button>

          {/* Emoji button inside input */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
          >
            <Smile size={17} />
          </button>
        </div>

        {/* Send Button or Thumbs Up Like - Always Pinned Right & Shrink-0 */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          className={`p-2 sm:p-2.5 rounded-full transition-all active:scale-90 shrink-0 z-10 ${
            text.trim() || selectedFile
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:scale-110'
          }`}
          title={text.trim() || selectedFile ? 'Send Message' : 'Send Like 👍'}
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin text-white" />
          ) : text.trim() || selectedFile ? (
            <Send size={18} />
          ) : (
            <ThumbsUp size={20} className="transition-transform active:rotate-[-12deg]" />
          )}
        </button>
      </div>

      {/* Tenor GIF Search & Send Modal */}
      <GifPickerModal
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSelectTenorGif}
        title="Send Tenor GIF to Chat"
      />
    </div>
  );
};
