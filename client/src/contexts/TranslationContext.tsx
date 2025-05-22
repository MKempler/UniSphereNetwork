import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

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
  // Default to browser language or English
  const [userLanguage, setUserLanguage] = useState<LanguageCode>(
    () => navigator.language.split('-')[0] || 'en'
  );
  
  const [isAutoTranslateEnabled, setIsAutoTranslateEnabled] = useState(true);
  
  // Cache to store already translated text
  const [translationCache, setTranslationCache] = useState<Record<string, Record<string, string>>>({});

  // Detect language of text
  const detectLanguage = useCallback(async (text: string): Promise<LanguageCode> => {
    try {
      const response = await apiRequest('POST', '/api/detect-language', { text });
      const data = await response.json();
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
      const response = await apiRequest('POST', '/api/translate', {
        text,
        targetLanguage
      });
      
      const data = await response.json();
      
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
    setIsAutoTranslateEnabled(prev => !prev);
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