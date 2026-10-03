/**
 * Tenor GIF Service
 * Provides trending GIFs, search, and reaction categories via Tenor API
 */

export interface TenorGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
}

// Curated high-quality Tenor GIF library for instant zero-latency responses & offline reliability
const CURATED_TENOR_GIFS: Record<string, TenorGif[]> = {
  trending: [
    {
      id: 'tenor-heart-1',
      title: 'Heart Love Cute',
      url: 'https://media.tenor.com/j0xQ67Qz280AAAAC/heart-love.gif',
      previewUrl: 'https://media.tenor.com/j0xQ67Qz280AAAAM/heart-love.gif'
    },
    {
      id: 'tenor-cheers-1',
      title: 'Cheers Celebration',
      url: 'https://media.tenor.com/978m8_Z64sAAAAAC/cheers-leonardo-dicaprio.gif',
      previewUrl: 'https://media.tenor.com/978m8_Z64sAAAAAM/cheers-leonardo-dicaprio.gif'
    },
    {
      id: 'tenor-laugh-1',
      title: 'Laughing Funny LOL',
      url: 'https://media.tenor.com/K3n41vX320AAAAAC/laughing-cat.gif',
      previewUrl: 'https://media.tenor.com/K3n41vX320AAAAAM/laughing-cat.gif'
    },
    {
      id: 'tenor-panda-1',
      title: 'Cute Panda Hello China',
      url: 'https://media.tenor.com/vHq_H-h1Q1EAAAAC/panda-cute.gif',
      previewUrl: 'https://media.tenor.com/vHq_H-h1Q1EAAAAM/panda-cute.gif'
    },
    {
      id: 'tenor-dance-1',
      title: 'Happy Dance Vibes',
      url: 'https://media.tenor.com/eP49E56C65gAAAAC/happy-dance.gif',
      previewUrl: 'https://media.tenor.com/eP49E56C65gAAAAM/happy-dance.gif'
    },
    {
      id: 'tenor-thumbsup-1',
      title: 'Thumbs Up Great Job',
      url: 'https://media.tenor.com/YwN9r81R18cAAAAC/thumbs-up-good-job.gif',
      previewUrl: 'https://media.tenor.com/YwN9r81R18cAAAAM/thumbs-up-good-job.gif'
    },
    {
      id: 'tenor-fire-1',
      title: 'Fire Lit Awesome',
      url: 'https://media.tenor.com/L1k_VvXgL7wAAAAC/fire-lit.gif',
      previewUrl: 'https://media.tenor.com/L1k_VvXgL7wAAAAM/fire-lit.gif'
    },
    {
      id: 'tenor-cat-1',
      title: 'Cute Cat Vibe',
      url: 'https://media.tenor.com/0AXU3fK4JzYAAAAC/cat-vibing.gif',
      previewUrl: 'https://media.tenor.com/0AXU3fK4JzYAAAAM/cat-vibing.gif'
    }
  ],
  heart: [
    {
      id: 'tenor-heart-1',
      title: 'Heart Sparkle Love',
      url: 'https://media.tenor.com/j0xQ67Qz280AAAAC/heart-love.gif',
      previewUrl: 'https://media.tenor.com/j0xQ67Qz280AAAAM/heart-love.gif'
    },
    {
      id: 'tenor-heart-2',
      title: 'Blowing Kiss Love',
      url: 'https://media.tenor.com/I2v7K4Lp6ZMAAAAC/love-kiss.gif',
      previewUrl: 'https://media.tenor.com/I2v7K4Lp6ZMAAAAM/love-kiss.gif'
    },
    {
      id: 'tenor-heart-3',
      title: 'Sending Hearts',
      url: 'https://media.tenor.com/7X1CjUj6g-0AAAAC/hearts-flying.gif',
      previewUrl: 'https://media.tenor.com/7X1CjUj6g-0AAAAM/hearts-flying.gif'
    }
  ],
  funny: [
    {
      id: 'tenor-funny-1',
      title: 'Cat Laughing Hard',
      url: 'https://media.tenor.com/K3n41vX320AAAAAC/laughing-cat.gif',
      previewUrl: 'https://media.tenor.com/K3n41vX320AAAAAM/laughing-cat.gif'
    },
    {
      id: 'tenor-funny-2',
      title: 'Minion Laughing',
      url: 'https://media.tenor.com/2s4R24v2y8MAAAAC/minions-laughing.gif',
      previewUrl: 'https://media.tenor.com/2s4R24v2y8MAAAAM/minions-laughing.gif'
    },
    {
      id: 'tenor-funny-3',
      title: 'Wipe Tears Laughing',
      url: 'https://media.tenor.com/Z4C3c5_3980AAAAC/crying-laughing.gif',
      previewUrl: 'https://media.tenor.com/Z4C3c5_3980AAAAM/crying-laughing.gif'
    }
  ],
  china: [
    {
      id: 'tenor-china-1',
      title: 'Cute Panda Eating Bamboo',
      url: 'https://media.tenor.com/vHq_H-h1Q1EAAAAC/panda-cute.gif',
      previewUrl: 'https://media.tenor.com/vHq_H-h1Q1EAAAAM/panda-cute.gif'
    },
    {
      id: 'tenor-china-2',
      title: 'Kung Fu Tea Ceremony',
      url: 'https://media.tenor.com/5lV54_7v4nUAAAAC/tea-pouring.gif',
      previewUrl: 'https://media.tenor.com/5lV54_7v4nUAAAAM/tea-pouring.gif'
    },
    {
      id: 'tenor-china-3',
      title: 'Sichuan Hotpot Steaming',
      url: 'https://media.tenor.com/978m8_Z64sAAAAAC/cheers-leonardo-dicaprio.gif',
      previewUrl: 'https://media.tenor.com/978m8_Z64sAAAAAM/cheers-leonardo-dicaprio.gif'
    }
  ],
  cheers: [
    {
      id: 'tenor-cheers-1',
      title: 'Great Gatsby Cheers',
      url: 'https://media.tenor.com/978m8_Z64sAAAAAC/cheers-leonardo-dicaprio.gif',
      previewUrl: 'https://media.tenor.com/978m8_Z64sAAAAAM/cheers-leonardo-dicaprio.gif'
    },
    {
      id: 'tenor-cheers-2',
      title: 'Party Confetti Celebration',
      url: 'https://media.tenor.com/eP49E56C65gAAAAC/happy-dance.gif',
      previewUrl: 'https://media.tenor.com/eP49E56C65gAAAAM/happy-dance.gif'
    }
  ]
};

/**
 * Search Tenor GIFs by query or return trending
 */
export async function searchTenorGifs(query: string): Promise<TenorGif[]> {
  const clean = (query || '').toLowerCase().trim();

  // Try live Tenor API if network allows
  try {
    const qParam = encodeURIComponent(clean || 'trending');
    const res = await fetch(`https://g.tenor.com/v1/search?q=${qParam}&key=LIVDSRZULELA&limit=16`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((r: any) => ({
          id: r.id,
          title: r.title || r.content_description || 'Tenor GIF',
          url: r.media?.[0]?.gif?.url || r.media?.[0]?.tinygif?.url || r.url,
          previewUrl: r.media?.[0]?.tinygif?.url || r.media?.[0]?.nanogif?.url || r.url
        }));
      }
    }
  } catch (err) {
    // Graceful fallback to curated library
  }

  // Fallback to high quality curated categories
  if (!clean || clean === 'trending') {
    return CURATED_TENOR_GIFS.trending;
  }

  for (const [cat, list] of Object.entries(CURATED_TENOR_GIFS)) {
    if (clean.includes(cat) || cat.includes(clean)) {
      return list;
    }
  }

  // Filter all curated
  const all = Object.values(CURATED_TENOR_GIFS).flat();
  const matched = all.filter((g) => g.title.toLowerCase().includes(clean));
  return matched.length > 0 ? matched : CURATED_TENOR_GIFS.trending;
}
