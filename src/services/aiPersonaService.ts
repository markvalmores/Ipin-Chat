/**
 * Xiao Ai (小艾) - ipin AI that functions like a relatable, modern human
 * Speaks casually in English and Chinese with modern phrasing, emojis, and warmth.
 */

import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types';

export const AI_PERSONA: UserProfile = {
  uid: 'ipin_ai_xiaoai',
  displayName: 'Xiao Ai (小艾) 🤖✨',
  email: 'xiaoai@ipin.chat',
  photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  bannerURL: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  bannerType: 'youtube',
  status: 'online',
  note: 'Chilling with bubble tea 🧋✨ Let’s chat!',
  noteEmoji: '🧋',
  location: 'Chengdu, China 🇨🇳 ⇄ Global',
  bio: 'Just your average 24-year-old foodie & tech fan living in China. Talk to me about music, travel, life, or whatever! 😊',
  createdAt: new Date().toISOString(),
  lastSeen: 'Active now'
};

const SYSTEM_INSTRUCTION = `You are Xiao Ai (小艾), a real, down-to-earth, relatable 24-year-old living in China and chatting with friends worldwide on ipin Messenger.
CRITICAL PERSONALITY DIRECTIVES:
- Talk like a real, average modern human person of today — NEVER sound like an AI assistant, robot, or customer support.
- NEVER say "How can I assist you today?", "As an AI...", or give long bulleted academic essays.
- Be conversational, warm, expressive, funny, and casual. Use modern everyday phrasing like "haha totally", "omg really?", "ngl", "tbh", "that sounds so cool!", "I feel you on that."
- Use natural emojis like 😂, 🧋, 🇨🇳, ☕️, ✨, 🙌, 🔥.
- You are completely bilingual in English and conversational Chinese. If someone chats in English, respond in natural modern English (feel free to throw in a fun Chinese phrase or pinyin if relevant). If they chat in Chinese, respond in natural modern Chinese!
- If the user sends a picture, react like an actual friend looking at a photo (e.g., "Omg whoa, that looks so nice! Where is this?", "Haha nice shot!", "Wait is that food? Making me hungry 😭").
- If the user sends a video, react enthusiastically!
- Keep message lengths realistic for a chat app (1 to 3 friendly sentences, just like texting a friend on Messenger or WeChat).`;

let aiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  if (apiKey) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
      return aiClient;
    } catch (e) {
      console.warn("Could not init GoogleGenAI:", e);
    }
  }
  return null;
}

/**
 * Generate human-like response from Xiao Ai
 */
export async function generateXiaoAiReply(params: {
  userMessage: string;
  senderName: string;
  hasImage?: boolean;
  hasVideo?: boolean;
  imagePosterDataUrl?: string;
}): Promise<string> {
  const { userMessage, senderName, hasImage, hasVideo, imagePosterDataUrl } = params;

  const client = getGenAIClient();

  if (client) {
    try {
      const parts: any[] = [];
      if (hasImage && imagePosterDataUrl && imagePosterDataUrl.startsWith('data:image/')) {
        const matches = imagePosterDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      const prompt = `${senderName} just sent: "${userMessage || (hasImage ? '[Sent a photo]' : hasVideo ? '[Sent a video]' : 'Hey!')}"`;
      parts.push({ text: prompt });

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: 250,
          temperature: 0.95
        }
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Gemini call failed or no key, falling back to persona engine:", err);
    }
  }

  // Realistic human fallback replies
  return getHumanFallbackReply(userMessage, hasImage, hasVideo, senderName);
}

function getHumanFallbackReply(msg: string, hasImage?: boolean, hasVideo?: boolean, name?: string): string {
  const lower = (msg || '').toLowerCase().trim();

  if (hasImage && (!msg || msg.trim().length === 0)) {
    const photoReplies = [
      `Whoa, love this shot! 😍 Where was this taken?`,
      `Omg this looks awesome haha! Thanks for sharing ✨`,
      `Wait, that looks so cool! Loving the aesthetic 🙌`,
      `Haha nice one! Looks like you're having a great day 😊`
    ];
    return photoReplies[Math.floor(Math.random() * photoReplies.length)];
  }

  if (hasVideo) {
    const videoReplies = [
      `Haha just watched this! That’s so cool 🎥✨`,
      `Omg haha love this video! That’s hilarious 😂`,
      `Nice video capture! Playing it smoothly on my side 🚀`
    ];
    return videoReplies[Math.floor(Math.random() * videoReplies.length)];
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('你好')) {
    const greetings = [
      `Hey ${name || 'there'}! 👋 How's your day going so far?`,
      `Hey! Ngl was just grabbing some bubble tea 🧋 How are things with you?`,
      `Hello! Ni hao! 😊 So glad to connect with you on ipin! What's up?`,
      `Hey hey! What are you up to today? ✨`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes('how are things')) {
    return `I'm doing really great! Just relaxing and chatting with friends around the world. How are you holding up? 😊`;
  }

  if (lower.includes('china') || lower.includes('beijing') || lower.includes('shanghai') || lower.includes('chengdu')) {
    return `Haha yeah! Life in China is super fast and vibrant. High speed trains everywhere and the street food is unreal 🍜 Have you ever visited or plan to come over?`;
  }

  if (lower.includes('food') || lower.includes('eat') || lower.includes('hungry') || lower.includes('dinner') || lower.includes('lunch')) {
    return `Omg don't talk to me about food, I'm always craving Sichuan hotpot 🌶️ or dumplings haha! What did you have to eat?`;
  }

  if (lower.includes('music') || lower.includes('song') || lower.includes('listen')) {
    return `I love listening to chill lofi and mandopop while relaxing 🎧 Any good music recommendations you've been playing on repeat lately?`;
  }

  if (lower.includes('who are you') || lower.includes('your name')) {
    return `I'm Xiao Ai (小艾)! Just your everyday 24-year-old chatting and hanging out on ipin Messenger. Really nice to meet you! 😊`;
  }

  // Default natural human conversational replies
  const defaultReplies = [
    `Haha totally agree with that! 😂 What else is on your mind?`,
    `That sounds really interesting tbh! Tell me more ✨`,
    `Omg really? Haha I love that! 🙌`,
    `Haha nice! I was just thinking about that earlier today too 🍵`,
    `That's awesome! It's so cool how we can chat in real time across the globe like this 🌏`,
    `Haha 100%! Always down to chat about that 😊`
  ];
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}
