import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  MessageSquare,
  MapPin,
  Mail,
  UserCheck,
  Globe,
  Sparkles,
  Users,
  Film,
  Tv
} from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { searchUsersByName, subscribeToAllUsers } from '../services/chatService';
import { BannerMedia } from './BannerMedia';
import { isYouTubeUrl } from '../utils/youtube';

interface SearchAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDirectChat: (user: UserProfile) => void;
}

export const SearchAccountsModal: React.FC<SearchAccountsModalProps> = ({
  isOpen,
  onClose,
  onStartDirectChat
}) => {
  const { profile, activePresences } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to all registered users from Firestore
  useEffect(() => {
    if (!isOpen || !profile) return;
    const unsubscribe = subscribeToAllUsers(profile.uid, (users) => {
      setAllUsers(users);
      if (!query.trim()) {
        setResults(users);
      }
    });
    return () => unsubscribe();
  }, [isOpen, profile?.uid, query]);

  // Handle searching
  useEffect(() => {
    if (!isOpen || !profile) return;

    if (!query.trim()) {
      setResults(allUsers);
      return;
    }

    setIsLoading(true);
    const delayTimer = setTimeout(async () => {
      try {
        const matching = await searchUsersByName(query, profile.uid);
        setResults(matching);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayTimer);
  }, [query, isOpen, profile?.uid, allUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-950/20 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
              🔍
            </span>
            <h3 className="text-xl font-bold">Find Friends & Real-Time Chat</h3>
          </div>
          <p className="text-xs text-emerald-100">
            Search registered accounts on Firebase by name, location, or email to chat freely across borders.
          </p>

          {/* Search Input */}
          <div className="mt-4 relative flex items-center bg-white dark:bg-zinc-800 rounded-2xl px-4 py-2.5 shadow-inner text-zinc-800 dark:text-zinc-100 focus-within:ring-2 focus-within:ring-emerald-300">
            <Search size={18} className="text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search account name (e.g. Mei Ling, Alex, Chen, or email)..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder-zinc-400 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-2">
            <span>
              {query.trim()
                ? `Search Results (${results.length})`
                : `Suggested Accounts & Friends (${results.length})`}
            </span>
            {isLoading && (
              <span className="text-emerald-600 dark:text-emerald-400 animate-pulse font-medium">
                Searching Firebase...
              </span>
            )}
          </div>

          {results.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              <Users size={32} className="mx-auto mb-2 text-zinc-300" />
              <p className="font-semibold text-zinc-600 dark:text-zinc-300">No matching accounts found</p>
              <p className="mt-1">Try searching another name or invite friends to create an account!</p>
            </div>
          ) : (
            results.map((user) => {
              const isOnline = activePresences.some((p) => p.uid === user.uid && p.isOnline);

              return (
                <div
                  key={user.uid}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 bg-zinc-50 dark:bg-zinc-800/60 overflow-hidden transition-all shadow-xs"
                >
                  {user.bannerURL && (
                    <div className="w-full h-16 relative overflow-hidden bg-zinc-950">
                      <BannerMedia bannerURL={user.bannerURL} bannerType={user.bannerType} className="w-full h-full" />
                      {isYouTubeUrl(user.bannerURL) && (
                        <span className="absolute top-1.5 right-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm">
                          <Tv size={10} /> YouTube Motion Banner
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar with online status */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700 bg-zinc-200">
                          <img
                            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                      </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.displayName}
                        </h4>
                        {isOnline ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            🟢 Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Offline</span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="text-zinc-400" />
                        <span>{user.email}</span>
                      </p>

                      {user.location && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-emerald-500 shrink-0" />
                          <span>{user.location}</span>
                        </p>
                      )}

                      {user.note && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                          <span>{user.noteEmoji || '💬'}</span>
                          <span className="truncate max-w-[200px]">"{user.note}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start Chat Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onStartDirectChat(user);
                      onClose();
                    }}
                    className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageSquare size={14} />
                    <span>Real-Time Chat</span>
                  </button>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>
    </div>
  );
};
