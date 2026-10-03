// Cross-border Pinyin & Translation helper for ipin Messenger

interface TranslationResult {
  translated: string;
  pinyin?: string;
  sourceLang: 'zh' | 'en' | 'other';
  targetLang: 'zh' | 'en';
}

const COMMON_PHRASES: Record<string, { en: string; zh: string; pinyin: string }> = {
  'hello': { en: 'Hello!', zh: '你好！', pinyin: 'Nǐ hǎo!' },
  'hi': { en: 'Hi there!', zh: '嗨！', pinyin: 'Hāi!' },
  'how are you': { en: 'How are you?', zh: '你好吗？', pinyin: 'Nǐ hǎo ma?' },
  'good morning': { en: 'Good morning!', zh: '早上好！', pinyin: 'Zǎoshang hǎo!' },
  'good night': { en: 'Good night!', zh: '晚安！', pinyin: 'Wǎn\'ān!' },
  'thank you': { en: 'Thank you very much!', zh: '非常感谢！', pinyin: 'Fēicháng gǎnxiè!' },
  'thanks': { en: 'Thanks!', zh: '谢谢！', pinyin: 'Xièxiè!' },
  'welcome': { en: 'You are welcome!', zh: '不客气！/ 欢迎！', pinyin: 'Bù kèqì! / Huānyíng!' },
  'nice to meet you': { en: 'Nice to meet you!', zh: '很高兴认识你！', pinyin: 'Hěn gāoxìng rènshí nǐ!' },
  'what are you doing': { en: 'What are you doing?', zh: '你在做什么呢？', pinyin: 'Nǐ zài zuò shénme ne?' },
  'have you eaten': { en: 'Have you eaten yet?', zh: '你吃了吗？', pinyin: 'Nǐ chīle ma?' },
  'let us chat': { en: 'Let\'s chat!', zh: '我们聊聊吧！', pinyin: 'Wǒmen liáoliáo ba!' },
  'see you later': { en: 'See you later!', zh: '回头见！', pinyin: 'Huítóu jiàn!' },
  'goodbye': { en: 'Goodbye!', zh: '再见！', pinyin: 'Zàijiàn!' },
  'beautiful': { en: 'So beautiful!', zh: '太美了！', pinyin: 'Tài měile!' },
  'awesome': { en: 'Awesome!', zh: '太棒了！', pinyin: 'Tài bàngle!' },
};

export function translateText(text: string): TranslationResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  
  // Detect Chinese characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(clean);

  // Exact phrase match
  for (const [key, val] of Object.entries(COMMON_PHRASES)) {
    if (lower.includes(key)) {
      if (hasChinese) {
        return {
          translated: val.en,
          pinyin: val.pinyin,
          sourceLang: 'zh',
          targetLang: 'en'
        };
      } else {
        return {
          translated: val.zh,
          pinyin: val.pinyin,
          sourceLang: 'en',
          targetLang: 'zh'
        };
      }
    }
  }

  if (hasChinese) {
    // Generate English translation
    return {
      translated: `[English translation]: "${clean}"`,
      pinyin: extractSimulatedPinyin(clean),
      sourceLang: 'zh',
      targetLang: 'en'
    };
  } else {
    // Generate Chinese translation
    return {
      translated: `[中文翻译]: "${clean}"`,
      pinyin: 'Zhōngwén fānyì',
      sourceLang: 'en',
      targetLang: 'zh'
    };
  }
}

function extractSimulatedPinyin(text: string): string {
  // Common character to pinyin mappings for standard chat words
  const pinyinMap: Record<string, string> = {
    '你': 'nǐ', '好': 'hǎo', '吗': 'ma', '我': 'wǒ', '很': 'hěn',
    '高': 'gāo', '兴': 'xìng', '认': 'rèn', '识': 'shí', '谢': 'xiè',
    '大': 'dà', '家': 'jiā', '吃': 'chī', '饭': 'fàn', '早': 'zǎo',
    '晚': 'wǎn', '安': 'ān', '朋': 'péng', '友': 'yǒu', '在': 'zài',
    '这': 'zhè', '太': 'tài', '方': 'fāng', '便': 'biàn', '了': 'le',
    '美': 'měi', '丽': 'lì', '中': 'zhōng', '国': 'guó', '世': 'shì',
    '界': 'jiè', '天': 'tiān', '气': 'qì', '欢': 'huān', '迎': 'yíng'
  };

  const chars = Array.from(text);
  const pinyinWords: string[] = [];

  for (const char of chars) {
    if (pinyinMap[char]) {
      pinyinWords.push(pinyinMap[char]);
    } else if (/[a-zA-Z0-9]/.test(char)) {
      pinyinWords.push(char);
    }
  }

  if (pinyinWords.length > 0) {
    return pinyinWords.join(' ');
  }
  return 'Zhōngwén Pīnyīn';
}
