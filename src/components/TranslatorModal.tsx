import React, { useState } from 'react';
import {
  X,
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  Sparkles,
  Send,
  Volume2
} from 'lucide-react';
import { translateText, isChinese, generatePinyin } from '../utils/translator';

interface TranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoChat?: (text: string) => void;
}

export const TranslatorModal: React.FC<TranslatorModalProps> = ({
  isOpen,
  onClose,
  onInsertIntoChat
}) => {
  const [inputText, setInputText] = useState('');
  const [direction, setDirection] = useState<'auto' | 'en_to_zh' | 'zh_to_en'>('auto');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentIsChinese = isChinese(inputText);
  const effectiveDirection =
    direction === 'auto'
      ? currentIsChinese
        ? 'zh_to_en'
        : 'en_to_zh'
      : direction;

  const translation = inputText.trim()
    ? translateText(
        inputText,
        effectiveDirection === 'en_to_zh' ? 'zh' : 'en'
      )
    : null;

  const handleCopy = () => {
    if (!translation) return;
    const textToCopy = `${translation.translated} ${translation.pinyin ? `(${translation.pinyin})` : ''}`.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!translation || !onInsertIntoChat) return;
    const textToInsert = `${translation.translated} ${translation.pinyin ? `[Pinyin: ${translation.pinyin}]` : ''}`.trim();
    onInsertIntoChat(textToInsert);
    onClose();
  };

  const QUICK_PHRASES = [
    { en: 'Hello, how are you?', zh: '你好，你好吗？' },
    { en: 'Have you eaten yet?', zh: '你吃了吗？' },
    { en: 'Thank you very much!', zh: '非常感谢！' },
    { en: 'Let’s grab Sichuan hotpot!', zh: '我们去吃四川火锅吧！' },
    { en: 'Nice to meet you!', zh: '很高兴认识你！' },
    { en: 'Cross-border chat is so fast!', zh: '跨境聊天太快了！' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Languages size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Chinese ⇄ English Translator
              </h3>
              <p className="text-xs text-zinc-500">
                Translate with Pinyin pronunciation & instant chat insert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Direction Switcher */}
        <div className="mt-4 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl text-xs font-semibold">
          <span className="flex-1 text-center py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-700 shadow-xs text-zinc-900 dark:text-zinc-100">
            {effectiveDirection === 'en_to_zh' ? '🇺🇸 English' : '🇨🇳 Chinese (中文)'}
          </span>
          <button
            type="button"
            onClick={() =>
              setDirection(effectiveDirection === 'en_to_zh' ? 'zh_to_en' : 'en_to_zh')
            }
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-emerald-600 dark:text-emerald-400 transition-colors"
            title="Swap translation direction"
          >
            <ArrowRightLeft size={16} />
          </button>
          <span className="flex-1 text-center py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-700 shadow-xs text-zinc-900 dark:text-zinc-100">
            {effectiveDirection === 'en_to_zh' ? '🇨🇳 Chinese (中文)' : '🇺🇸 English'}
          </span>
        </div>

        {/* Input Text Area */}
        <div className="mt-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              effectiveDirection === 'en_to_zh'
                ? 'Type in English (e.g. Good morning, let us chat!)...'
                : '输入中文 (例如: 你好，今天天气真好！)...'
            }
            rows={3}
            className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            autoFocus
          />
        </div>

        {/* Translation Output Box */}
        {translation && (
          <div className="mt-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Translation
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {translation.translated}
            </p>

            {translation.pinyin && (
              <div className="pt-1 text-xs text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-200/50 dark:bg-emerald-900/60 font-semibold text-[10px]">
                  PINYIN
                </span>
                <span>{translation.pinyin}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Phrase Suggestions */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Quick Everyday Phrases
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {QUICK_PHRASES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(effectiveDirection === 'en_to_zh' ? item.en : item.zh)}
                className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
              >
                {effectiveDirection === 'en_to_zh' ? item.en : item.zh}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {onInsertIntoChat && (
            <button
              type="button"
              disabled={!translation}
              onClick={handleInsert}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Send size={15} />
              <span>Insert into Chat Input</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
