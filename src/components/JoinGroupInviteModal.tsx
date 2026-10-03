import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Link,
  Check,
  CheckCheck,
  ArrowRight,
  Shield,
  Sparkles,
  Search,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getGroupChatByIdOrInvite, addMembersToGroupChat } from '../services/chatService';

interface JoinGroupInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvite?: string;
  onJoinSuccess: (conversation: Conversation) => void;
}

export const JoinGroupInviteModal: React.FC<JoinGroupInviteModalProps> = ({
  isOpen,
  onClose,
  initialInvite = '',
  onJoinSuccess
}) => {
  const { profile } = useAuth();
  const [inviteInput, setInviteInput] = useState(initialInvite);
  const [resolvedGroup, setResolvedGroup] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialInvite) {
      setInviteInput(initialInvite);
      handleResolve(initialInvite);
    } else {
      setResolvedGroup(null);
      setErrorMessage(null);
    }
  }, [initialInvite, isOpen]);

  if (!isOpen) return null;

  const handleResolve = async (inputToResolve: string) => {
    const target = inputToResolve.trim();
    if (!target) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const group = await getGroupChatByIdOrInvite(target);
      if (group) {
        setResolvedGroup(group);
      } else {
        setResolvedGroup(null);
        setErrorMessage('Could not find a group chat with this link or invite code.');
      }
    } catch (err) {
      setResolvedGroup(null);
      setErrorMessage('Failed to resolve invite link. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!resolvedGroup || !profile || isJoining) return;
    setIsJoining(true);

    try {
      const isAlreadyMember = resolvedGroup.participantIds?.includes(profile.uid);
      if (!isAlreadyMember) {
        await addMembersToGroupChat(resolvedGroup.id, [profile], profile);
      }

      // Clear ?invite= from URL without page reload
      if (window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        url.searchParams.delete('join');
        window.history.replaceState({}, '', url.pathname + url.search);
      }

      onJoinSuccess(resolvedGroup);
      onClose();
    } catch (err) {
      setErrorMessage('Failed to join group chat. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const isAlreadyMember =
    resolvedGroup && profile
      ? resolvedGroup.participantIds?.includes(profile.uid)
      : false;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Link size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Join Group Chat
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enter an invite link or join code to jump into the conversation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 sm:p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Group Invite Link or Code
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleResolve(inviteInput)}
                  placeholder="Paste link e.g. https://.../?invite=... or code"
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-850 focus:outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => handleResolve(inviteInput)}
                disabled={!inviteInput.trim() || isLoading}
                className="px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs disabled:opacity-40 transition-all shadow-xs shrink-0"
              >
                {isLoading ? 'Checking...' : 'Resolve'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold animate-in fade-in duration-100">
              {errorMessage}
            </div>
          )}

          {/* Group Card Preview */}
          {resolvedGroup && (
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-700/80 space-y-3.5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 shrink-0 shadow-md">
                  <img
                    src={resolvedGroup.avatar || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150'}
                    alt={resolvedGroup.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {resolvedGroup.title}
                    </h4>
                    {resolvedGroup.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                        {resolvedGroup.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    👥 {resolvedGroup.memberCount || resolvedGroup.participantIds?.length || 2} members
                  </p>
                </div>
              </div>

              {resolvedGroup.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                  {resolvedGroup.description}
                </p>
              )}

              {/* Status Banner */}
              {isAlreadyMember ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCheck size={16} />
                  <span>You are already a member of this group chat!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs">
                  <Sparkles size={14} className="text-emerald-500 shrink-0" />
                  <span>You will join this cross-border group chat immediately.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          {resolvedGroup && (
            <button
              type="button"
              onClick={handleJoin}
              disabled={isJoining}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>{isJoining ? 'Joining...' : isAlreadyMember ? 'Open Group' : 'Join Group Chat'}</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
