import React, { useState } from 'react';
import { X, Smile, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_SUGGESTIONS = ['🍵', '☕️', '💻', '🚀', '🇨🇳', '🗽', '🎧', '✨', '🍜', '✈️', '😴', '🌿'];

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateNote } = useAuth();
  const [noteText, setNoteText] = useState(profile?.note || '');
  const [selectedEmoji, setSelectedEmoji] = useState(profile?.noteEmoji || '🍵');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setIsSubmitting(true);
    try {
      await updateNote(noteText.trim(), selectedEmoji);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsSubmitting(true);
    try {
      await updateNote('', '');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-semibold">
              💭
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Share a thought</h3>
              <p className="text-xs text-zinc-500">Visible for 24 hours to your global friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Note Preview Bubble on Avatar */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative flex flex-col items-center">
            {/* Floating thought bubble */}
            <div className="mb-2 max-w-[240px] px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg relative text-center">
              <span className="text-base mr-1.5">{selectedEmoji}</span>
              <span className="text-sm font-medium break-words">
                {noteText.trim() || 'Share what\'s on your mind...'}
              </span>
              {/* Bubble pointer tail */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-teal-600 rotate-45" />
            </div>

            {/* Avatar */}
            <div className="w-16 h-16 rounded-full ring-4 ring-emerald-500/20 overflow-hidden shadow-md">
              <img
                src={profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={profile?.displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Choose Mood / Activity Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-emerald-500 text-white scale-110 shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Thought Note (Max 60 characters)
            </label>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 60))}
              placeholder="e.g. West Lake evening walk 🍵 or Late night coding in NY"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 text-sm"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1 text-xs text-zinc-400">
              <span>{60 - noteText.length} characters left</span>
              <span>24h freshness</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {profile?.note && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
              >
                Clear Note
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !noteText.trim()}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Sharing...' : 'Share Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
