import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Story, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';

interface StoryBarProps {
  stories: Story[];
  onOpenStory: (index: number) => void;
  onOpenCreateStory: () => void;
  onOpenNoteModal: () => void;
  onSelectUserDirectChat: (user: UserProfile) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  stories,
  onOpenStory,
  onOpenCreateStory,
  onOpenNoteModal,
  onSelectUserDirectChat
}) => {
  const { profile, activePresences } = useAuth();

  // Find user's own story if any
  const myStoryIndex = stories.findIndex((s) => s.userId === profile?.uid);

  // Group stories by user (show latest per user)
  const uniqueUserStories: { story: Story; index: number }[] = [];
  const seenUsers = new Set<string>();

  stories.forEach((story, idx) => {
    if (!seenUsers.has(story.userId)) {
      seenUsers.add(story.userId);
      uniqueUserStories.push({ story, index: idx });
    }
  });

  return (
    <div className="py-3 px-3 overflow-x-auto scrollbar-none border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
      <div className="flex items-start gap-3 min-w-max">
        {/* 1. Current User: Avatar + Note Speech Bubble + Add Story Plus */}
        <div className="flex flex-col items-center gap-1.5 w-16">
          <div className="relative flex flex-col items-center">
            {/* Note Speech Bubble above avatar */}
            <button
              onClick={onOpenNoteModal}
              title="Click to leave or edit your Note"
              className="mb-1 max-w-[70px] truncate px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium shadow-md transition-transform hover:scale-105 flex items-center justify-center gap-0.5"
            >
              <span>{profile?.noteEmoji || '💭'}</span>
              <span className="truncate">{profile?.note || '+ Note'}</span>
            </button>

            {/* Avatar with add story badge */}
            <div className="relative cursor-pointer group" onClick={onOpenCreateStory}>
              <div className="w-13 h-13 rounded-full overflow-hidden ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 transition-all">
                <img
                  src={profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={profile?.displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Add Story (+) button on avatar bottom-right */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateStory();
                }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-sm"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-full">
            Your Story
          </span>
        </div>

        {/* 2. Friends' Stories with Emerald Rings */}
        {uniqueUserStories
          .filter((item) => item.story.userId !== profile?.uid)
          .map((item) => {
            const hasViewed = profile && item.story.viewers.includes(profile.uid);
            // Match if user has a note
            const demoUser = DEMO_USERS.find((u) => u.uid === item.story.userId);

            return (
              <div
                key={item.story.id}
                className="flex flex-col items-center gap-1.5 w-16 cursor-pointer group"
                onClick={() => onOpenStory(item.index)}
              >
                <div className="relative flex flex-col items-center">
                  {/* Note Bubble if author has one */}
                  {demoUser?.note && (
                    <div className="mb-1 max-w-[70px] truncate px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-emerald-500/30 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium shadow-xs flex items-center gap-0.5">
                      <span>{demoUser.noteEmoji || '💬'}</span>
                      <span className="truncate">{demoUser.note}</span>
                    </div>
                  )}

                  {/* Story Avatar Ring */}
                  <div
                    className={`w-13 h-13 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                      hasViewed
                        ? 'ring-2 ring-zinc-300 dark:ring-zinc-700'
                        : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-[2.5px] shadow-sm'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white dark:ring-zinc-900">
                      <img
                        src={item.story.userPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={item.story.userName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-full text-center">
                  {item.story.userName.split(' ')[0]}
                </span>
              </div>
            );
          })}

        {/* 3. Other Active Friends without stories */}
        {DEMO_USERS.filter(
          (u) =>
            u.uid !== profile?.uid &&
            !uniqueUserStories.some((item) => item.story.userId === u.uid)
        ).map((user) => (
          <div
            key={user.uid}
            className="flex flex-col items-center gap-1.5 w-16 cursor-pointer group"
            onClick={() => onSelectUserDirectChat(user)}
          >
            <div className="relative flex flex-col items-center">
              {/* Note Bubble */}
              {user.note && (
                <div className="mb-1 max-w-[70px] truncate px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium shadow-xs flex items-center gap-0.5">
                  <span>{user.noteEmoji || '💬'}</span>
                  <span className="truncate">{user.note}</span>
                </div>
              )}

              <div className="relative">
                <div className="w-13 h-13 rounded-full overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700 group-hover:ring-emerald-500 transition-all">
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                {/* Active green dot */}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
              </div>
            </div>

            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-full text-center">
              {user.displayName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
