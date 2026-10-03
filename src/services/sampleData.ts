import { Conversation, Story, UserProfile } from '../types';

export const INITIAL_PUBLIC_CHANNELS: Conversation[] = [
  {
    id: 'global-china-lounge',
    type: 'group',
    title: '🌏 Global-China Lounge',
    description: 'The premier open hub connecting friends across China, North America, Europe, and the world.',
    avatar: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150&auto=format&fit=crop&q=80',
    participantIds: ['all-users', 'system-bot'],
    lastMessageText: 'Welcome to ipin Messenger! Chat freely across borders without any restrictions.',
    lastMessageSender: 'ipin Bot 🤖',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'beijing-newyork-bridge',
    type: 'group',
    title: '🗽 Beijing ⇄ New York Bridge',
    description: 'Real-time social exchange between the 12-hour timezone difference. Coffee vs Hotpot!',
    avatar: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80',
    participantIds: ['all-users', 'system-bot'],
    lastMessageText: 'Good morning New York! Good night Beijing! ✨',
    lastMessageSender: 'Mei Ling',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'language-culture-exchange',
    type: 'group',
    title: '💬 English & Chinese Practice',
    description: 'Learn Chinese (Pinyin) & English slang, idioms, travel tips, and cultural etiquette.',
    avatar: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=150&auto=format&fit=crop&q=80',
    participantIds: ['all-users', 'system-bot'],
    lastMessageText: 'Tap the "Translate & Pinyin" button on any message to see how it works!',
    lastMessageSender: 'Chen Wei',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'tech-shenzhen-silicon',
    type: 'group',
    title: '⚡️ Tech: Shenzhen to Silicon Valley',
    description: 'Hardware hacks, AI tools, drones, electronic markets, and tech ventures.',
    avatar: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=150&auto=format&fit=crop&q=80',
    participantIds: ['all-users', 'system-bot'],
    lastMessageText: 'Check out the new drone video I uploaded in the chat!',
    lastMessageSender: 'Alex Vance',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  }
];

export const DEMO_USERS: UserProfile[] = [
  {
    uid: 'demo_user_meiling',
    displayName: 'Mei Ling (美玲)',
    email: 'meiling@ipin.chat',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bannerURL: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
    bannerType: 'image',
    status: 'online',
    note: 'Sipping Jasmine tea in West Lake 🍵',
    noteEmoji: '🍵',
    noteUpdatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    location: 'Hangzhou, China 🇨🇳',
    bio: 'Photographer & cultural bridge enthusiast. Excited to connect with friends globally!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    lastSeen: 'Active now'
  },
  {
    uid: 'demo_user_alex',
    displayName: 'Alex Carter',
    email: 'alex@ipin.chat',
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    bannerURL: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    bannerType: 'video', // Demo MP4 profile banner!
    status: 'online',
    note: 'Building cross-border apps 💻✨',
    noteEmoji: '🚀',
    noteUpdatedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    location: 'San Francisco, USA 🇺🇸',
    bio: 'Software engineer fascinated by China speed and high-speed rail systems.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    lastSeen: 'Active now'
  },
  {
    uid: 'demo_user_chenwei',
    displayName: 'Chen Wei (陈伟)',
    email: 'chenwei@ipin.chat',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bannerURL: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    bannerType: 'youtube', // Demo YouTube Auto-Looping video banner!
    status: 'online',
    note: 'Shenzhen Huaqiangbei market visit 🔌',
    noteEmoji: '🤖',
    noteUpdatedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    location: 'Shenzhen, China 🇨🇳',
    bio: 'Hardware creator, IoT enthusiast, tea drinker.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    lastSeen: 'Active now'
  },
  {
    uid: 'demo_user_sophia',
    displayName: 'Sophia Bennett',
    email: 'sophia@ipin.chat',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bannerURL: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
    bannerType: 'image',
    status: 'away',
    note: 'Learning Mandarin tones! 🇨🇳 📚',
    noteEmoji: '📖',
    noteUpdatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    location: 'London, UK 🇬🇧',
    bio: 'Linguistics student exploring international communication tools.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    lastSeen: '12m ago'
  }
];

export const INITIAL_STORIES: Story[] = [
  {
    id: 'story-meiling-1',
    userId: 'demo_user_meiling',
    userName: 'Mei Ling (美玲)',
    userPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    text: 'Sunset over the Great Wall today! So peaceful and majestic. 🏯✨',
    viewers: ['demo_user_alex', 'demo_user_sophia'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: 'story-alex-1',
    userId: 'demo_user_alex',
    userName: 'Alex Carter',
    userPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    mediaType: 'video', // Demo video story!
    text: 'Morning breeze in California before team standup. Sending good vibes to Asia! 🌿',
    viewers: ['demo_user_meiling'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'story-chenwei-1',
    userId: 'demo_user_chenwei',
    userName: 'Chen Wei (陈伟)',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    mediaUrl: '',
    mediaType: 'text',
    text: '💡 Did you know? Shenzhen grew from a small fishing town of 30,000 into a 17M tech megalopolis in just 40 years! 🏙️⚡️',
    bgColor: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    viewers: ['demo_user_meiling', 'demo_user_alex'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
  }
];

export const INITIAL_CHANNEL_MESSAGES: Record<string, any[]> = {
  'global-china-lounge': [
    {
      id: 'msg-gcl-1',
      conversationId: 'global-china-lounge',
      senderId: 'system-bot',
      senderName: 'ipin Bot 🤖',
      senderPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      text: 'Welcome to ipin Messenger Web App! 🟢 Connecting China and the world seamlessly. You can send PNG, GIF, JPG, BMP, APNG photos, and MP4/AVI/FLV/SWF videos of any size. Try out the Reactions, Stories, Notes, and Real-Time Active counter!',
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      reactions: { 'demo_user_meiling': '❤️', 'demo_user_alex': '👍', 'demo_user_chenwei': '🎉' },
      readBy: ['demo_user_meiling', 'demo_user_alex', 'demo_user_chenwei', 'demo_user_sophia']
    },
    {
      id: 'msg-gcl-2',
      conversationId: 'global-china-lounge',
      senderId: 'demo_user_meiling',
      senderName: 'Mei Ling (美玲)',
      senderPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'Hello everyone! 大家好！I just got back from West Lake in Hangzhou. The tea harvest has started! 🍵',
      mediaUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      fileName: 'west_lake_tea_terrace.jpg',
      fileFormat: 'jpg',
      fileSize: 1845000,
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      reactions: { 'demo_user_alex': '😍', 'demo_user_sophia': '❤️' },
      readBy: ['demo_user_alex', 'demo_user_chenwei', 'demo_user_sophia']
    },
    {
      id: 'msg-gcl-3',
      conversationId: 'global-china-lounge',
      senderId: 'demo_user_alex',
      senderName: 'Alex Carter',
      senderPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      text: 'That looks stunning Mei Ling! Here is a clip I took of the coastal redwoods this morning. The green theme here on ipin feels right at home! 🌲',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
      mediaType: 'video',
      fileName: 'california_redwoods_breeze.mp4',
      fileFormat: 'mp4',
      fileSize: 4200000,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      reactions: { 'demo_user_meiling': '🔥', 'demo_user_chenwei': '👏' },
      readBy: ['demo_user_meiling', 'demo_user_chenwei']
    },
    {
      id: 'msg-gcl-4',
      conversationId: 'global-china-lounge',
      senderId: 'demo_user_chenwei',
      senderName: 'Chen Wei (陈伟)',
      senderPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'Awesome! Notice how fast messages arrive through the global bridge. You can also click the "Translate" button below my message to see pinyin: 这太方便了！(Zhè tài fāngbiàn le! - This is so convenient!)',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      reactions: { 'demo_user_alex': '👍' },
      readBy: ['demo_user_meiling']
    }
  ]
};
