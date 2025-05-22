import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/simpleAuth';

type LanguageCode = string; // e.g. 'en', 'es', 'fr', etc.

// Define response types
interface DetectLanguageResponse {
  language: LanguageCode;
}

interface TranslateTextResponse {
  translatedText: string;
  sourceLanguage: LanguageCode;
}

interface TranslationContextType {
  userLanguage: LanguageCode;
  setUserLanguage: (lang: LanguageCode) => void;
  translateText: (text: string, targetLang?: LanguageCode) => Promise<string>;
  detectLanguage: (text: string) => Promise<LanguageCode>;
  isAutoTranslateEnabled: boolean;
  toggleAutoTranslate: () => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // Default to stored preference, then browser language, then English
  const [userLanguage, setUserLanguageState] = useState<LanguageCode>(() => {
    // First try to get from localStorage
    const storedLanguage = localStorage.getItem('userLanguage');
    if (storedLanguage) {
      return storedLanguage;
    }
    
    // Next, try browser language
    return navigator.language.split('-')[0] || 'en';
  });
  
  // Auto-translate settings also persisted
  const [isAutoTranslateEnabled, setIsAutoTranslateEnabled] = useState(() => {
    const storedPreference = localStorage.getItem('autoTranslate');
    return storedPreference === null ? true : storedPreference === 'true';
  });
  
  // Cache to store already translated text
  const [translationCache, setTranslationCache] = useState<Record<string, Record<string, string>>>({});

  // Load user language preference from profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.language) {
      console.log(`User language from profile: ${user.language}, current language: ${userLanguage}`);
      
      if (user.language !== userLanguage) {
        console.log(`Updating language preference to: ${user.language}`);
        setUserLanguageState(user.language);
        // Save to localStorage for persistence
        localStorage.setItem('userLanguage', user.language);
      }
    }
  }, [isAuthenticated, user?.language, userLanguage]);

  // Update language preference
  const setUserLanguage = useCallback((lang: LanguageCode) => {
    setUserLanguageState(lang);
    
    // Save to localStorage
    localStorage.setItem('userLanguage', lang);
    
    // If authenticated, update user profile
    if (isAuthenticated) {
      apiRequest('PATCH', '/api/users/settings', { language: lang })
        .catch(error => console.error('Failed to update language preference:', error));
    }
  }, [isAuthenticated]);

  // Detect language of text
  const detectLanguage = useCallback(async (text: string): Promise<LanguageCode> => {
    try {
      const data = await apiRequest<DetectLanguageResponse>('POST', '/api/detect-language', { text });
      return data.language;
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English on failure
    }
  }, []);

  // Translate text to target language
  const translateText = useCallback(async (
    text: string, 
    targetLang?: LanguageCode
  ): Promise<string> => {
    // If no text or target language is user's language, return as is
    if (!text || text.trim() === '') return text;
    
    const targetLanguage = targetLang || userLanguage;
    
    // Check cache first
    if (translationCache[text]?.[targetLanguage]) {
      return translationCache[text][targetLanguage];
    }
    
    try {
      const data = await apiRequest<TranslateTextResponse>('POST', '/api/translate', {
        text,
        targetLanguage
      });
      
      // Update cache
      setTranslationCache(prev => ({
        ...prev,
        [text]: {
          ...(prev[text] || {}),
          [targetLanguage]: data.translatedText
        }
      }));
      
      return data.translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on failure
    }
  }, [userLanguage, translationCache]);

  const toggleAutoTranslate = useCallback(() => {
    setIsAutoTranslateEnabled(prev => {
      const newValue = !prev;
      // Persist auto-translate preference
      localStorage.setItem('autoTranslate', String(newValue));
      return newValue;
    });
  }, []);

  const value = {
    userLanguage,
    setUserLanguage,
    translateText,
    detectLanguage,
    isAutoTranslateEnabled,
    toggleAutoTranslate
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}; 