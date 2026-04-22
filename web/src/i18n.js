import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

const stored = (() => {
  try {
    return localStorage.getItem('scout_language');
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  lng: stored || 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
  },
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
    document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(lng) ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('scout_language', lng);
    } catch {
      /* noop */
    }
  });
  document.documentElement.lang = i18n.language;
}

export default i18n;
