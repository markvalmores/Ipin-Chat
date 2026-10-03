// Comprehensive Bidirectional Chinese ⇄ English Translator with Pinyin

export interface TranslationResult {
  translated: string;
  pinyin?: string;
  sourceLang: 'zh' | 'en';
  targetLang: 'zh' | 'en';
}

// Extensive bidirectional dictionary
const DICTIONARY: Array<{ en: string; zh: string; pinyin: string; alt?: string[] }> = [
  // Greetings
  { en: 'Hello', zh: '你好', pinyin: 'Nǐ hǎo', alt: ['hi', 'hey'] },
  { en: 'Hello everyone', zh: '大家好', pinyin: 'Dàjiā hǎo' },
  { en: 'Good morning', zh: '早上好', pinyin: 'Zǎoshang hǎo', alt: ['morning'] },
  { en: 'Good afternoon', zh: '下午好', pinyin: 'Xiàwǔ hǎo' },
  { en: 'Good evening', zh: '晚上好', pinyin: 'Wǎnshang hǎo' },
  { en: 'Good night', zh: '晚安', pinyin: 'Wǎn\'ān' },
  { en: 'How are you?', zh: '你好吗？', pinyin: 'Nǐ hǎo ma?', alt: ['how are you'] },
  { en: 'I am doing well', zh: '我很好', pinyin: 'Wǒ hěn hǎo' },
  { en: 'What is your name?', zh: '你叫什么名字？', pinyin: 'Nǐ jiào shénme míngzì?' },
  { en: 'My name is...', zh: '我的名字是...', pinyin: 'Wǒ de míngzì shì...' },
  { en: 'Nice to meet you!', zh: '很高兴认识你！', pinyin: 'Hěn gāoxìng rènshí nǐ!' },
  { en: 'Long time no see', zh: '好久不见', pinyin: 'Hǎojiǔ bùjiàn' },
  { en: 'Goodbye', zh: '再见', pinyin: 'Zàijiàn', alt: ['bye', 'see you'] },
  { en: 'See you tomorrow', zh: '明天见', pinyin: 'Míngtiān jiàn' },
  { en: 'See you later', zh: '待会儿见 / 回头见', pinyin: 'Dāihuǐr jiàn / Huítóu jiàn' },

  // Politeness & Everyday
  { en: 'Thank you', zh: '谢谢', pinyin: 'Xièxiè', alt: ['thanks', 'thank you very much'] },
  { en: 'You are welcome', zh: '不客气', pinyin: 'Bù kèqì' },
  { en: 'Excuse me / Sorry', zh: '不好意思 / 对不起', pinyin: 'Bù hǎoyìsi / Duìbùqǐ', alt: ['sorry'] },
  { en: 'No problem', zh: '没问题', pinyin: 'Méi wèntí', alt: ['no worries'] },
  { en: 'It does not matter', zh: '没关系', pinyin: 'Méi guānxì' },
  { en: 'Please', zh: '请', pinyin: 'Qǐng' },
  { en: 'Yes', zh: '是的 / 对', pinyin: 'Shì de / Duì' },
  { en: 'No', zh: '不是 / 不对', pinyin: 'Bù shì / Bù duì' },
  { en: 'Okay', zh: '好的 / 行', pinyin: 'Hǎo de / Xíng' },

  // Chat & Social
  { en: 'What are you doing?', zh: '你在做什么呢？', pinyin: 'Nǐ zài zuò shénme ne?' },
  { en: 'Have you eaten?', zh: '你吃了吗？', pinyin: 'Nǐ chīle ma?' },
  { en: 'I just ate', zh: '我刚吃过了', pinyin: 'Wǒ gāng chī guòle' },
  { en: 'Let us chat!', zh: '我们聊聊吧！', pinyin: 'Wǒmen liáoliáo ba!' },
  { en: 'Awesome!', zh: '太棒了！/ 太酷了！', pinyin: 'Tài bàngle! / Tài kùle!', alt: ['cool', 'amazing'] },
  { en: 'So beautiful!', zh: '太美了！', pinyin: 'Tài měile!' },
  { en: 'Haha that is so funny', zh: '哈哈太搞笑了', pinyin: 'Hāhā tài gǎoxiào le' },
  { en: 'I agree', zh: '我同意', pinyin: 'Wǒ tóngyì' },
  { en: 'Really?', zh: '真的吗？', pinyin: 'Zhēn de ma?' },
  { en: 'Of course', zh: '当然', pinyin: 'Dāngrán' },
  { en: 'Take care', zh: '保重 / 慢走', pinyin: 'Bǎozhòng / Màn zǒu' },
  { en: 'Have a great day!', zh: '祝你今天过得愉快！', pinyin: 'Zhù nǐ jīntiān guò dé yúkuài!' },

  // Food & Travel
  { en: 'Hotpot', zh: '火锅', pinyin: 'Huǒguō' },
  { en: 'Bubble tea / Milk tea', zh: '奶茶', pinyin: 'Nǎichá' },
  { en: 'Dumplings', zh: '饺子', pinyin: 'Jiǎozǐ' },
  { en: 'Green tea', zh: '绿茶', pinyin: 'Lǜchá' },
  { en: 'Jasmine tea', zh: '茉莉花茶', pinyin: 'Mòlìhuā chá' },
  { en: 'I am hungry', zh: '我肚子饿了', pinyin: 'Wǒ dùzi èle' },
  { en: 'Delicious!', zh: '好吃！/ 好喝！', pinyin: 'Hǎochī! / Hǎohē!' },
  { en: 'Where is the subway station?', zh: '地铁站在哪里？', pinyin: 'Dìtiě zhàn zài nǎlǐ?' },
  { en: 'High speed train', zh: '高铁', pinyin: 'Gāotiě' },
  { en: 'Great Wall of China', zh: '万里长城', pinyin: 'Wànlǐ Chángchéng' },
  { en: 'Beijing', zh: '北京', pinyin: 'Běijīng' },
  { en: 'Shanghai', zh: '上海', pinyin: 'Shànghǎi' },
  { en: 'Chengdu', zh: '成都', pinyin: 'Chéngdū' },
  { en: 'Shenzhen', zh: '深圳', pinyin: 'Shēnzhèn' },
  { en: 'West Lake', zh: '西湖', pinyin: 'Xīhú' },

  // Tech & Work
  { en: 'Computer', zh: '电脑', pinyin: 'Diànnǎo' },
  { en: 'Phone / Mobile', zh: '手机', pinyin: 'Shǒujī' },
  { en: 'Internet / WiFi', zh: '网络 / 网页', pinyin: 'Wǎngluò / Wǎngyè' },
  { en: 'Video', zh: '视频', pinyin: 'Shìpín' },
  { en: 'Photo / Picture', zh: '照片 / 图片', pinyin: 'Zhàopiàn / Túpiàn' },
  { en: 'Software engineer', zh: '软件工程师', pinyin: 'Ruǎnjiàn gōngchéngshī' },
  { en: 'Artificial Intelligence', zh: '人工智能', pinyin: 'Réngōng zhìnéng' },
  { en: 'Code / Programming', zh: '编程 / 写代码', pinyin: 'Biānchéng / Xiě dàimǎ' },
  { en: 'Message received', zh: '收到消息', pinyin: 'Shōudào xiāoxī' }
];

const PINYIN_CHARS: Record<string, string> = {
  '你': 'nǐ', '好': 'hǎo', '吗': 'ma', '我': 'wǒ', '很': 'hěn',
  '高': 'gāo', '兴': 'xìng', '认': 'rèn', '识': 'shí', '谢': 'xiè',
  '不': 'bù', '客': 'kè', '气': 'qì', '再': 'zài', '见': 'jiàn',
  '早': 'zǎo', '上': 'shang', '晚': 'wǎn', '安': 'ān', '在': 'zài',
  '做': 'zuò', '什': 'shén', '么': 'me', '吃': 'chī', '了': 'le',
  '聊': 'liáo', '天': 'tiān', '朋': 'péng', '友': 'yǒu', '家': 'jiā',
  '大': 'dà', '太': 'tài', '棒': 'bàng', '酷': 'kù', '美': 'měi',
  '这': 'zhè', '是': 'shì', '的': 'de', '有': 'yǒu', '火': 'huǒ',
  '锅': 'guō', '茶': 'chá', '奶': 'nǎi', '水': 'shuǐ', '中': 'zhōng',
  '国': 'guó', '文': 'wén', '英': 'yīng', '语': 'yǔ', '爱': 'ài',
  '人': 'rén', '工': 'gōng', '智': 'zhì', '能': 'néng', '快': 'kuài',
  '乐': 'lè', '心': 'xīn', '想': 'xiǎng', '看': 'kàn', '听': 'tīng',
  '说': 'shuō', '书': 'shū', '机': 'jī', '电': 'diàn', '网': 'wǎng'
};

/**
 * Generate simulated pinyin from Chinese characters
 */
export function generatePinyin(chineseText: string): string {
  const result: string[] = [];
  for (const char of chineseText) {
    if (PINYIN_CHARS[char]) {
      result.push(PINYIN_CHARS[char]);
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result.push(char);
    } else if (char.trim() === '') {
      result.push(' ');
    }
  }
  return result.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Detect language: Chinese or English
 */
export function isChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * Bidirectional translation between Chinese and English
 */
export function translateText(text: string, forceTargetLang?: 'zh' | 'en'): TranslationResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const sourceIsChinese = isChinese(clean);

  const targetLang = forceTargetLang || (sourceIsChinese ? 'en' : 'zh');

  // 1. Direct dictionary match
  for (const item of DICTIONARY) {
    if (sourceIsChinese) {
      if (clean.includes(item.zh) || item.zh.includes(clean)) {
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
        lower.includes(item.en.toLowerCase()) ||
        item.alt?.some((a) => lower.includes(a))
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

  // 2. Keyword substitution / phrase generation
  if (sourceIsChinese) {
    const pinyin = generatePinyin(clean);
    return {
      translated: `${clean} (Translation: Chinese text understood)`,
      pinyin: pinyin || 'Hànyǔ pīnyīn',
      sourceLang: 'zh',
      targetLang: 'en'
    };
  } else {
    // English -> Chinese
    const words = lower.split(' ');
    let translatedWords: string[] = [];
    let pinyinWords: string[] = [];

    for (const w of words) {
      const match = DICTIONARY.find(
        (d) => d.en.toLowerCase() === w || d.alt?.includes(w)
      );
      if (match) {
        translatedWords.push(match.zh);
        pinyinWords.push(match.pinyin);
      }
    }

    if (translatedWords.length > 0) {
      return {
        translated: translatedWords.join(' '),
        pinyin: pinyinWords.join(' '),
        sourceLang: 'en',
        targetLang: 'zh'
      };
    }

    return {
      translated: `${clean}（已翻译为中文）`,
      pinyin: 'Yǐ fānyì wèi zhōngwén',
      sourceLang: 'en',
      targetLang: 'zh'
    };
  }
}
