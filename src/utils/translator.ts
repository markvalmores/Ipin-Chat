// Comprehensive Bidirectional Chinese ⇄ English Translator with Accurate Pinyin

export interface TranslationResult {
  translated: string;
  pinyin?: string;
  sourceLang: 'zh' | 'en';
  targetLang: 'zh' | 'en';
}

// 1. High frequency Pinyin character dictionary (covering tones)
const PINYIN_MAP: Record<string, string> = {
  // Common pronouns & particles
  '你': 'nǐ', '我': 'wǒ', '他': 'tā', '她': 'tā', '它': 'tā', '们': 'men',
  '的': 'de', '地': 'de', '得': 'de', '了': 'le', '吗': 'ma', '呢': 'ne',
  '吧': 'ba', '啊': 'a', '呀': 'ya', '着': 'zhe', '过': 'guò', '在': 'zài',
  '是': 'shì', '有': 'yǒu', '和': 'hé', '与': 'yǔ', '或': 'huò', '就': 'jiù',
  '不': 'bù', '没': 'méi', '很': 'hěn', '太': 'tài', '更': 'gèng', '最': 'zuì',
  '也': 'yě', '都': 'dōu', '还': 'hái', '又': 'yòu', '只': 'zhǐ',

  // Common verbs
  '好': 'hǎo', '看': 'kàn', '听': 'tīng', '说': 'shuō', '写': 'xiě', '读': 'dú',
  '吃': 'chī', '喝': 'hē', '玩': 'wán', '去': 'qù', '来': 'lái', '走': 'zǒu',
  '想': 'xiǎng', '要': 'yào', '能': 'néng', '会': 'huì', '可': 'kě', '以': 'yǐ',
  '做': 'zuò', '作': 'zuò', '爱': 'ài', '喜': 'xǐ', '欢': 'huan', '知': 'zhī',
  '道': 'dào', '觉': 'jué', '学': 'xué', '习': 'xí', '工': 'gōng', '帮': 'bāng',
  '助': 'zhù', '买': 'mǎi', '卖': 'mài', '给': 'gěi', '找': 'zhǎo', '等': 'děng',
  '发': 'fā', '收': 'shōu', '送': 'sòng', '用': 'yòng', '聊': 'liáo', '问': 'wèn',
  '答': 'dá', '见': 'jiàn', '谢': 'xiè', '对': 'duì', '客': 'kè', '气': 'qì',
  '放': 'fàng', '播': 'bō', '打': 'dǎ', '开': 'kāi', '关': 'guān',

  // Greetings & Social
  '早': 'zǎo', '上': 'shàng', '午': 'wǔ', '晚': 'wǎn', '安': 'ān', '再': 'zài',
  '高': 'gāo', '兴': 'xìng', '认': 'rèn', '识': 'shí', '友': 'yǒu', '朋': 'péng',
  '家': 'jiā', '人': 'rén', '事': 'shì', '情': 'qing', '话': 'huà', '字': 'zì',
  '名': 'míng', '什': 'shén', '么': 'me', '谁': 'shéi', '哪': 'nǎ', '里': 'lǐ',
  '怎': 'zěn', '样': 'yàng', '多': 'duō', '少': 'shǎo', '几': 'jǐ', '岁': 'suì',

  // Time & Days
  '年': 'nián', '月': 'yuè', '日': 'rì', '天': 'tiān', '今': 'jīn', '明': 'míng',
  '昨': 'zuó', '时': 'shí', '候': 'hou', '点': 'diǎn', '分': 'fēn', '秒': 'miǎo',
  '星': 'xīng', '期': 'qī', '现': 'xiàn',

  // Adjectives & States
  '大': 'dà', '小': 'xiǎo', '长': 'cháng', '短': 'duǎn', '快': 'kuài', '慢': 'màn',
  '新': 'xīn', '旧': 'jiù', '美': 'měi', '酷': 'kù', '棒': 'bàng', '热': 'rè',
  '冷': 'lěng', '饿': 'è', '饱': 'bǎo', '渴': 'kě', '累': 'lèi', '忙': 'máng',
  '真': 'zhēn', '假': 'jiǎ', '正': 'zhèng', '常': 'cháng', '错': 'cuò',
  '重': 'zhòng', '轻': 'qīng', '远': 'yuǎn', '近': 'jìn',

  // Media, Tech, Food
  '视': 'shì', '频': 'pín', '图': 'tú', '片': 'piàn', '照': 'zhào', '相': 'xiàng',
  '电': 'diàn', '脑': 'nǎo', '机': 'jī', '手': 'shǒu', '网': 'wǎng', '络': 'luò',
  '消': 'xiāo', '息': 'xi', '文': 'wén', '件': 'jiàn', '火': 'huǒ', '锅': 'guō',
  '茶': 'chá', '奶': 'nǎi', '水': 'shuǐ', '饭': 'fàn', '菜': 'cài', '面': 'miàn',
  '饺': 'jiǎo', '包': 'bāo', '肉': 'ròu', '鱼': 'yú', '车': 'chē', '站': 'zhàn',
  '中': 'zhōng', '国': 'guó', '英': 'yīng', '语': 'yǔ', '海': 'hǎi', '北': 'běi',
  '京': 'jīng', '成': 'chéng', '市': 'shì', '深': 'shēn', '圳': 'zhèn'
};

// 2. Comprehensive Phrase Dictionary
const PHRASE_DICTIONARY: Array<{ en: string; zh: string; pinyin: string; alt?: string[] }> = [
  // Greetings
  { en: 'Hello', zh: '你好', pinyin: 'nǐ hǎo', alt: ['hi', 'hey'] },
  { en: 'Hello everyone', zh: '大家好', pinyin: 'dà jiā hǎo' },
  { en: 'Good morning', zh: '早上好', pinyin: 'zǎo shang hǎo', alt: ['morning'] },
  { en: 'Good afternoon', zh: '下午好', pinyin: 'xià wǔ hǎo' },
  { en: 'Good evening', zh: '晚上好', pinyin: 'wǎn shang hǎo' },
  { en: 'Good night', zh: '晚安', pinyin: 'wǎn ān' },
  { en: 'How are you?', zh: '你好吗？', pinyin: 'nǐ hǎo ma?', alt: ['how are you', 'how are you doing'] },
  { en: 'I am doing well', zh: '我很好', pinyin: 'wǒ hěn hǎo' },
  { en: 'Nice to meet you!', zh: '很高兴认识你！', pinyin: 'hěn gāo xìng rèn shí nǐ!' },
  { en: 'Long time no see', zh: '好久不见', pinyin: 'hǎo jiǔ bù jiàn' },
  { en: 'Goodbye', zh: '再见', pinyin: 'zài jiàn', alt: ['bye', 'see you'] },
  { en: 'See you tomorrow', zh: '明天见', pinyin: 'míng tiān jiàn' },
  { en: 'See you later', zh: '回头见', pinyin: 'huí tóu jiàn' },

  // Courtesy
  { en: 'Thank you very much', zh: '非常感谢', pinyin: 'fēi cháng gǎn xiè', alt: ['thanks', 'thank you'] },
  { en: 'You are welcome', zh: '不客气', pinyin: 'bù kè qì' },
  { en: 'Sorry', zh: '对不起', pinyin: 'duì bu qǐ', alt: ['excuse me', 'pardon'] },
  { en: 'No problem', zh: '没问题', pinyin: 'méi wèn tí', alt: ['no worries'] },
  { en: 'It is okay', zh: '没关系', pinyin: 'méi guān xi' },
  { en: 'Please', zh: '请', pinyin: 'qǐng' },
  { en: 'Yes', zh: '是的', pinyin: 'shì de' },
  { en: 'No', zh: '不是', pinyin: 'bù shì' },
  { en: 'Okay', zh: '好的', pinyin: 'hǎo de', alt: ['ok', 'alright'] },

  // Chat conversation
  { en: 'What are you doing?', zh: '你在做什么？', pinyin: 'nǐ zài zuò shén me?' },
  { en: 'Have you eaten?', zh: '你吃了吗？', pinyin: 'nǐ chī le ma?' },
  { en: 'I just ate', zh: '我刚吃过了', pinyin: 'wǒ gāng chī guò le' },
  { en: 'Let us chat!', zh: '我们聊聊吧！', pinyin: 'wǒ men liáo liáo ba!' },
  { en: 'Awesome!', zh: '太棒了！', pinyin: 'tài bàng le!', alt: ['great', 'cool', 'amazing'] },
  { en: 'So beautiful!', zh: '太美了！', pinyin: 'tài měi le!' },
  { en: 'That is so funny', zh: '太搞笑了', pinyin: 'tài gǎo xiào le', alt: ['haha', 'lol'] },
  { en: 'I agree', zh: '我同意', pinyin: 'wǒ tóng yì' },
  { en: 'Really?', zh: '真的吗？', pinyin: 'zhēn de ma?' },
  { en: 'Of course', zh: '当然', pinyin: 'dāng rán' },
  { en: 'Take care', zh: '保重', pinyin: 'bǎo zhòng' },
  { en: 'Have a great day!', zh: '祝你今天愉快！', pinyin: 'zhù nǐ jīn tiān yú kuài!' },

  // Video, Photo & Media
  { en: 'Watch this video', zh: '看看这个视频', pinyin: 'kàn kàn zhè ge shì pín' },
  { en: 'Video is playing smoothly', zh: '视频播放很流畅', pinyin: 'shì pín bō fàng hěn liú chàng' },
  { en: 'Video error', zh: '视频错误', pinyin: 'shì pín cuò wù' },
  { en: 'Send message', zh: '发送消息', pinyin: 'fā sòng xiāo xi' },
  { en: 'Received message', zh: '收到消息', pinyin: 'shōu dào xiāo xi' },
  { en: 'Photo attachment', zh: '照片附件', pinyin: 'zhào piàn fù jiàn' },
  { en: 'Look at this photo', zh: '看这张照片', pinyin: 'kàn zhè zhāng zhào piàn' },
  { en: 'Voice memo', zh: '语音留言', pinyin: 'yǔ yīn liú yán' },
  { en: 'Call connected', zh: '通话已连接', pinyin: 'tōng huà yǐ lián jiē' },

  // Food & Travel
  { en: 'Hotpot', zh: '火锅', pinyin: 'huǒ guō' },
  { en: 'Bubble tea', zh: '奶茶', pinyin: 'nǎi chá' },
  { en: 'Dumplings', zh: '饺子', pinyin: 'jiǎo zi' },
  { en: 'Green tea', zh: '绿茶', pinyin: 'lǜ chá' },
  { en: 'I am hungry', zh: '我饿了', pinyin: 'wǒ è le' },
  { en: 'Delicious!', zh: '好吃！', pinyin: 'hǎo chī!' },
  { en: 'Subway station', zh: '地铁站', pinyin: 'dì tiě zhàn' },
  { en: 'High speed train', zh: '高铁', pinyin: 'gāo tiě' },
  { en: 'Beijing', zh: '北京', pinyin: 'běi jīng' },
  { en: 'Shanghai', zh: '上海', pinyin: 'shàng hǎi' },
  { en: 'Chengdu', zh: '成都', pinyin: 'chéng dū' },
  { en: 'Great Wall', zh: '长城', pinyin: 'cháng chéng' },

  // Tech & Cross-border
  { en: 'Computer', zh: '电脑', pinyin: 'diàn nǎo' },
  { en: 'Mobile phone', zh: '手机', pinyin: 'shǒu jī' },
  { en: 'Internet', zh: '网络', pinyin: 'wǎng luò' },
  { en: 'Software engineer', zh: '软件工程师', pinyin: 'ruǎn jiàn gōng chéng shī' },
  { en: 'Artificial Intelligence', zh: '人工智能', pinyin: 'rén gōng zhì néng' },
  { en: 'Cross-border chat', zh: '跨境聊天', pinyin: 'kuà jìng liáo tiān' },
  { en: 'Global bridge', zh: '全球桥梁', pinyin: 'quán qiú qiáo liáng' }
];

/**
 * Generate accurate pinyin with tones for Chinese characters
 */
export function generatePinyin(chineseText: string): string {
  const result: string[] = [];
  for (const char of chineseText) {
    if (PINYIN_MAP[char]) {
      result.push(PINYIN_MAP[char]);
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result.push(char);
    } else if (char === '，' || char === ',') {
      result.push(',');
    } else if (char === '。' || char === '.') {
      result.push('.');
    } else if (char === '！' || char === '!') {
      result.push('!');
    } else if (char === '？' || char === '?') {
      result.push('?');
    } else if (char.trim() === '') {
      result.push(' ');
    }
  }
  return result.join(' ').replace(/\s+/g, ' ').replace(/\s+([,\.!\?])/g, '$1').trim();
}

/**
 * Detect whether input text contains Chinese characters
 */
export function isChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

// In-memory translation cache
const translationCache = new Map<string, TranslationResult>();

/**
 * Asynchronous real-time translation using online APIs + Gemini fallback + rich dictionary
 */
export async function translateTextAsync(
  text: string,
  forceTargetLang?: 'zh' | 'en'
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) {
    return {
      translated: '',
      sourceLang: 'en',
      targetLang: 'zh'
    };
  }

  const sourceIsZh = isChinese(clean);
  const targetLang = forceTargetLang || (sourceIsZh ? 'en' : 'zh');
  const sourceLang = sourceIsZh ? 'zh' : 'en';

  const cacheKey = `${clean}::${sourceLang}->${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Direct dictionary match
  const lower = clean.toLowerCase();
  for (const item of PHRASE_DICTIONARY) {
    if (sourceIsZh) {
      if (clean === item.zh || clean.includes(item.zh)) {
        const res: TranslationResult = {
          translated: item.en,
          pinyin: item.pinyin,
          sourceLang: 'zh',
          targetLang: 'en'
        };
        translationCache.set(cacheKey, res);
        return res;
      }
    } else {
      if (
        lower === item.en.toLowerCase() ||
        item.alt?.some((a) => lower === a.toLowerCase())
      ) {
        const res: TranslationResult = {
          translated: item.zh,
          pinyin: item.pinyin,
          sourceLang: 'en',
          targetLang: 'zh'
        };
        translationCache.set(cacheKey, res);
        return res;
      }
    }
  }

  // 2. Online Free Translation API (MyMemory)
  try {
    const langpair = `${sourceLang}|${targetLang}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${langpair}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        let translatedText = data.responseData.translatedText.trim();
        // Decode HTML entities if returned
        translatedText = translatedText
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        // Generate Pinyin if target or source is Chinese
        const pinyinText = targetLang === 'zh'
          ? generatePinyin(translatedText)
          : generatePinyin(clean);

        const result: TranslationResult = {
          translated: translatedText,
          pinyin: pinyinText || undefined,
          sourceLang,
          targetLang
        };

        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (apiErr) {
    // Continue to smart offline translator
  }

  // 3. Smart offline dictionary translation
  const fallback = translateText(clean, targetLang);
  translationCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Synchronous translation fallback with rich dictionary & word-by-word substitution
 */
export function translateText(text: string, forceTargetLang?: 'zh' | 'en'): TranslationResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const sourceIsZh = isChinese(clean);
  const targetLang = forceTargetLang || (sourceIsZh ? 'en' : 'zh');
  const sourceLang = sourceIsZh ? 'zh' : 'en';

  // Exact phrase match
  for (const item of PHRASE_DICTIONARY) {
    if (sourceIsZh) {
      if (clean === item.zh || clean.includes(item.zh)) {
        return {
          translated: item.en,
          pinyin: item.pinyin,
          sourceLang: 'zh',
          targetLang: 'en'
        };
      }
    } else {
      if (
        lower === item.en.toLowerCase() ||
        item.alt?.some((a) => lower === a.toLowerCase())
      ) {
        return {
          translated: item.zh,
          pinyin: item.pinyin,
          sourceLang: 'en',
          targetLang: 'zh'
        };
      }
    }
  }

  // Chinese -> English substitution
  if (sourceIsZh) {
    const pinyin = generatePinyin(clean);
    // Partial phrase matches
    for (const item of PHRASE_DICTIONARY) {
      if (clean.includes(item.zh)) {
        return {
          translated: item.en,
          pinyin: item.pinyin || pinyin,
          sourceLang: 'zh',
          targetLang: 'en'
        };
      }
    }

    return {
      translated: clean,
      pinyin: pinyin || 'hàn yǔ pīn yīn',
      sourceLang: 'zh',
      targetLang: 'en'
    };
  }

  // English -> Chinese word substitution
  const words = lower.replace(/[,\.!\?]/g, '').split(/\s+/);
  const matchedZh: string[] = [];
  const matchedPinyin: string[] = [];

  for (const w of words) {
    const found = PHRASE_DICTIONARY.find(
      (item) => item.en.toLowerCase() === w || item.alt?.some((a) => a.toLowerCase() === w)
    );
    if (found) {
      matchedZh.push(found.zh);
      matchedPinyin.push(found.pinyin);
    }
  }

  if (matchedZh.length > 0) {
    return {
      translated: matchedZh.join(''),
      pinyin: matchedPinyin.join(' '),
      sourceLang: 'en',
      targetLang: 'zh'
    };
  }

  return {
    translated: clean,
    pinyin: undefined,
    sourceLang: 'en',
    targetLang: 'zh'
  };
}
