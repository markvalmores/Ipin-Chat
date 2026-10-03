import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, Flame, Sparkles, Smile, Clock, Trash2, Eye } from 'lucide-react';
import { Story, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { markStoryViewed, sendMessage, getOrCreateDirectConversation, deleteStory } from '../services/chatService';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  initialIndex?: number;
  onSelectConversation?: (convId: string) => void;
}

function getRemainingTimeStr(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialIndex = 0,
  onSelectConversation
}) => {
  const { profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const currentStory = stories[currentIndex];
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Mark viewed
  useEffect(() => {
    if (currentStory && profile) {
      markStoryViewed(currentStory.id, profile.uid);
    }
  }, [currentStory?.id, profile?.uid]);

  // Story progress timer
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    setProgress(0);
    const duration = currentStory.mediaType === 'video' ? 10000 : 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const intervalId = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(intervalId);
  }, [isOpen, currentIndex, isPaused, currentStory?.id]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleDeleteMyStory = async () => {
    if (!currentStory) return;
    await deleteStory(currentStory.id);
    if (stories.length <= 1) {
      onClose();
    } else {
      handleNext();
    }
  };

  const handleSendReply = async (emojiOrText?: string) => {
    const textToSend = emojiOrText || replyText.trim();
    if (!textToSend || !profile) return;

    setIsSendingReply(true);
    try {
      const recipientUser: UserProfile = {
        uid: currentStory.userId,
        displayName: currentStory.userName,
        email: `${currentStory.userId}@ipin.chat`,
        photoURL: currentStory.userPhoto
      };

      const conv = await getOrCreateDirectConversation(profile, recipientUser);
      await sendMessage(conv.id, profile, {
        text: `Replied to your story: "${textToSend}"`
      });

      setFeedbackToast(`Reply sent to ${currentStory.userName}!`);
      setReplyText('');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error("Could not send reply:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
      >
        <X size={20} />
      </button>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 md:left-8 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-110 hidden sm:flex"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 md:right-8 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-110 hidden sm:flex"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Main Story Container */}
      <div
        className="relative w-full max-w-md h-[90vh] max-h-[780px] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex gap-1 mb-2">
            {stories.map((s, idx) => (
              <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? '100%'
                        : idx === currentIndex
                        ? `${progress}%`
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User info */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full ring-2 ring-emerald-500 overflow-hidden shadow-md">
                <img
                  src={currentStory.userPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={currentStory.userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight drop-shadow-sm">{currentStory.userName}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <span>{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-300 font-mono font-medium">
                    <Clock size={11} />
                    {getRemainingTimeStr(currentStory.expiresAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {profile && profile.uid === currentStory.userId && (
                <button
                  type="button"
                  onClick={handleDeleteMyStory}
                  className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-md transition-colors"
                  title="Delete this story"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span>24h Story</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story Media / Text Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-900">
          {currentStory.mediaType === 'image' && (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}

          {currentStory.mediaType === 'video' && (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          )}

          {currentStory.mediaType === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{ background: currentStory.bgColor || 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' }}
            >
              <p className="text-2xl font-bold text-white leading-relaxed drop-shadow-lg max-w-xs">
                {currentStory.text}
              </p>
            </div>
          )}

          {/* Optional Caption overlay for image/video */}
          {currentStory.mediaType !== 'text' && currentStory.text && (
            <div className="absolute bottom-20 left-4 right-4 z-10 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm">
              <p>{currentStory.text}</p>
            </div>
          )}

          {/* Tap Zones for Mobile */}
          <div
            className="absolute left-0 top-16 bottom-20 w-1/3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-16 bottom-20 w-1/3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Toast Feedback */}
        {feedbackToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg animate-in slide-in-from-top duration-200">
            {feedbackToast}
          </div>
        )}

        {/* Quick Reactions & Reply Bar */}
        <div className="p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 space-y-2">
          {/* Story Viewers Count */}
          <div className="flex items-center justify-between text-[11px] text-zinc-300 px-2 pb-0.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Eye size={13} />
              <span>{currentStory.viewers?.length || 0} viewed</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              Active for 24 hours
            </span>
          </div>

          {/* Reaction emojis row */}
          <div className="flex items-center justify-around px-2 text-xl">
            {['❤️', '🔥', '🍵', '👏', '😮', '😂'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReply(emoji)}
                className="hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendReply();
              }}
              placeholder={`Send message to ${currentStory.userName}...`}
              className="flex-1 px-4 py-2 text-xs rounded-full bg-white/15 border border-white/20 text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="button"
              onClick={() => handleSendReply()}
              disabled={isSendingReply || !replyText.trim()}
              className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
