/**
 * Tenor & High-Definition GIF Service
 * Provides trending animated GIFs, search by keyword/category, and custom URL support.
 * Uses high-availability, verified permanent CDN animated GIFs.
 */

export interface TenorGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  emoji?: string;
  tags?: string[];
  width?: number;
  height?: number;
}

export const VERIFIED_GIFS: TenorGif[] = [
  // --- 1. TRENDING & POPULAR ---
  {
    id: 'gif-heart-1',
    title: 'Sending Love Hearts',
    emoji: '❤️',
    url: 'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
    tags: ['trending', 'heart', 'love', 'kiss', 'cute', 'hug', 'sweet']
  },
  {
    id: 'gif-cheers-gatsby',
    title: 'Gatsby Cheers Celebration',
    emoji: '🥂',
    url: 'https://i.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    tags: ['trending', 'cheers', 'celebration', 'party', 'congrats', 'drink', 'toast', 'bro']
  },
  {
    id: 'gif-laugh-cat',
    title: 'Laughing Cat LOL',
    emoji: '😂',
    url: 'https://i.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    tags: ['trending', 'funny', 'laugh', 'lol', 'haha', 'cat', 'kitten', 'humor', 'joke']
  },
  {
    id: 'gif-celebration-party',
    title: 'Confetti Celebration',
    emoji: '🎉',
    url: 'https://i.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    tags: ['trending', 'cheers', 'party', 'confetti', 'happy', 'yay', 'birthday', 'win']
  },
  {
    id: 'gif-thumbs-up',
    title: 'Thumbs Up Great Job',
    emoji: '👍',
    url: 'https://i.giphy.com/media/111ebonMs90YLu/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/111ebonMs90YLu/giphy.gif',
    tags: ['trending', 'thumbsup', 'ok', 'good', 'nice', 'approved', 'yes', 'great', 'agree']
  },
  {
    id: 'gif-fire-lit',
    title: 'Fire That is Lit',
    emoji: '🔥',
    url: 'https://i.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
    tags: ['trending', 'fire', 'lit', 'hot', 'cool', 'awesome', 'dope', 'amazing']
  },
  {
    id: 'gif-blinking-guy',
    title: 'Blinking Guy Shock',
    emoji: '😳',
    url: 'https://i.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
    tags: ['trending', 'shock', 'wow', 'meme', 'confused', 'what', 'blink', 'really']
  },
  {
    id: 'gif-mind-blown',
    title: 'Mind Blown Explosion',
    emoji: '🤯',
    url: 'https://i.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    tags: ['trending', 'shock', 'mindblown', 'wow', 'boom', 'crazy', 'insane', 'genius']
  },

  // --- 2. CHINA & PANDA & CULTURE ---
  {
    id: 'gif-panda-bamboo',
    title: 'Cute Panda Munching Bamboo',
    emoji: '🐼',
    url: 'https://i.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',
    tags: ['china', 'panda', 'cute', 'eating', 'bamboo', 'sichuan', 'bear', 'animal']
  },
  {
    id: 'gif-panda-rolling',
    title: 'Playful Panda Rolling Around',
    emoji: '🐼',
    url: 'https://i.giphy.com/media/MeIucajzTKvMZdVUoK/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/MeIucajzTKvMZdVUoK/giphy.gif',
    tags: ['china', 'panda', 'cute', 'roll', 'play', 'baby', 'happy']
  },
  {
    id: 'gif-chinese-tea',
    title: 'Kung Fu Tea Ceremony Pouring',
    emoji: '🍵',
    url: 'https://i.giphy.com/media/3o6ZsUJ44ffpnAW7Dy/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3o6ZsUJ44ffpnAW7Dy/giphy.gif',
    tags: ['china', 'tea', 'relax', 'zen', 'chill', 'culture', 'drink', 'beijing', 'peace']
  },
  {
    id: 'gif-kermit-tea',
    title: 'Sipping Tea None of My Business',
    emoji: '🐸',
    url: 'https://i.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    tags: ['tea', 'meme', 'chill', 'savage', 'sip', 'shade', 'drama']
  },

  // --- 3. LOVE & HEARTS ---
  {
    id: 'gif-heart-sparkle',
    title: 'Sparkling Heart Love',
    emoji: '💖',
    url: 'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
    tags: ['heart', 'love', 'romance', 'sparkle', 'sweet', 'crush', 'baby']
  },
  {
    id: 'gif-excited-kid',
    title: 'Excited Happy Love It',
    emoji: '🥰',
    url: 'https://i.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    tags: ['heart', 'happy', 'excited', 'love', 'yes', 'dance', 'yay']
  },

  // --- 4. FUNNY & MEMES ---
  {
    id: 'gif-cat-keyboard',
    title: 'Keyboard Cat Jamming',
    emoji: '🎹',
    url: 'https://i.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    tags: ['funny', 'cat', 'music', 'meme', 'cute', 'keyboard', 'retro', 'tech']
  },
  {
    id: 'gif-kitten-surprise',
    title: 'Cute Kitten Standing Up',
    emoji: '🐱',
    url: 'https://i.giphy.com/media/mlvseq9yvZhba/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/mlvseq9yvZhba/giphy.gif',
    tags: ['funny', 'cat', 'cute', 'kitten', 'meow', 'aww', 'pet']
  },
  {
    id: 'gif-dog-happy',
    title: 'Happy Dog Smiles',
    emoji: '🐶',
    url: 'https://i.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
    tags: ['funny', 'dog', 'puppy', 'smile', 'happy', 'cute', 'pet']
  },
  {
    id: 'gif-this-is-fine',
    title: 'This Is Fine Dog In Fire',
    emoji: '☕',
    url: 'https://i.giphy.com/media/QMHoU66sBXCAtonwrg/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/QMHoU66sBXCAtonwrg/giphy.gif',
    tags: ['funny', 'meme', 'fire', 'fine', 'ok', 'stress', 'chill', 'life']
  },
  {
    id: 'gif-crying-river',
    title: 'Crying Tears Fountain',
    emoji: '😭',
    url: 'https://i.giphy.com/media/wW95fEq09hOI8/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/wW95fEq09hOI8/giphy.gif',
    tags: ['funny', 'cry', 'sad', 'tears', 'sob', 'dramatic', 'laugh']
  },

  // --- 5. CELEBRATION & CHEERS ---
  {
    id: 'gif-clapping-applause',
    title: 'Standing Ovation Applause',
    emoji: '👏',
    url: 'https://i.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
    tags: ['cheers', 'clap', 'applause', 'bravo', 'respect', 'congrats', 'proud']
  },
  {
    id: 'gif-happy-dance',
    title: 'Dance Groove Moves',
    emoji: '💃',
    url: 'https://i.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    tags: ['cheers', 'dance', 'party', 'groove', 'vibe', 'celebrate', 'friday']
  },
  {
    id: 'gif-confetti-rain',
    title: 'Glitter Confetti Popper',
    emoji: '🎊',
    url: 'https://i.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    tags: ['cheers', 'confetti', 'party', 'popper', 'winner', 'woo']
  },
  {
    id: 'gif-cheers-toast',
    title: 'Champagne Toast Cheers',
    emoji: '🥂',
    url: 'https://i.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif',
    previewUrl: 'https://i.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif',
    tags: ['cheers', 'toast', 'drink', 'wine', 'gatsby', 'salute', 'celebrate']
  }
];

/**
 * Search Tenor / Animated GIFs by query or return category
 */
export async function searchTenorGifs(query: string): Promise<TenorGif[]> {
  const clean = (query || '').toLowerCase().trim();

  // If user pasted a direct GIF link, return it as custom GIF option immediately
  if (clean.startsWith('http') && (clean.includes('.gif') || clean.includes('giphy') || clean.includes('tenor'))) {
    return [
      {
        id: `custom-gif-${Date.now()}`,
        title: 'Custom Animated GIF',
        emoji: '✨',
        url: clean,
        previewUrl: clean,
        tags: ['custom', 'link']
      },
      ...VERIFIED_GIFS.slice(0, 10)
    ];
  }

  // If query is empty or "trending", return all trending GIFs
  if (!clean || clean === 'trending') {
    return VERIFIED_GIFS.filter((g) => g.tags?.includes('trending')).concat(
      VERIFIED_GIFS.filter((g) => !g.tags?.includes('trending'))
    );
  }

  // Keyword / Category Match
  const tokens = clean.split(/\s+/).filter(Boolean);

  const matched = VERIFIED_GIFS.filter((gif) => {
    const titleLower = gif.title.toLowerCase();
    const tags = gif.tags || [];

    // Direct token match
    return tokens.some((token) => {
      if (titleLower.includes(token)) return true;
      if (tags.some((t) => t.includes(token) || token.includes(t))) return true;
      return false;
    });
  });

  // If matched results exist, return them
  if (matched.length > 0) {
    return matched;
  }

  // Graceful fallback: return top high-energy trending GIFs so user never sees empty screen
  return VERIFIED_GIFS;
}
