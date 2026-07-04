import { useState, useEffect, useCallback } from 'react';

export type Lang = 'en' | 'es';

const KEY = 'pt-lang';

/** Bilingual string pair. */
export type T = { en: string; es: string };
export const pick = (t: T, lang: Lang) => t[lang];

/**
 * Language state, persisted to localStorage so it survives page navigation.
 * Each page is its own React island; localStorage keeps them in sync.
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved === 'en' || saved === 'es') setLangState(saved);
    document.documentElement.lang = saved || 'en';
  }, []);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  return [lang, setLang];
}
