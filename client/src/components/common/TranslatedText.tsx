import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LuGlobe, LuChevronDown } from 'react-icons/lu';

// Map of language codes to full language names
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'it': 'Italian',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'id': 'Indonesian',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'da': 'Danish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'el': 'Greek',
  'he': 'Hebrew',
  'uk': 'Ukrainian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'sk': 'Slovak',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian'
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

interface TranslatedTextProps {
  text: string;
  as?: React.ElementType;
  className?: string;
  showControls?: boolean;
  originalLanguage?: string;
}

export default function TranslatedText({ 
  text, 
  as: Component = 'span', 
  className = '',
  showControls = false,
  originalLanguage: initialLanguage
}: TranslatedTextProps) {
  const { translateText, detectLanguage, userLanguage, isAutoTranslateEnabled } = useTranslation();
  const [originalText] = useState<string>(text);
  const [displayedText, setDisplayedText] = useState<string>(text);
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [originalLanguage, setOriginalLanguage] = useState<string | null>(initialLanguage || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    // Only auto-translate if:
    // 1. Auto-translate is enabled
    // 2. The text is not empty
    // 3. We don't know the original language yet, or it's different from user language
    if (isAutoTranslateEnabled && text && (!originalLanguage || originalLanguage !== userLanguage)) {
      const detectAndTranslate = async () => {
        setIsLoading(true);
        
        try {
          // If we don't know the original language yet, detect it
          let sourceLanguage = originalLanguage;
          if (!sourceLanguage) {
            sourceLanguage = await detectLanguage(text);
            setOriginalLanguage(sourceLanguage);
          }
          
          // Only translate if original language is different from user language
          if (sourceLanguage !== userLanguage) {
            const translated = await translateText(text);
            setDisplayedText(translated);
            setIsTranslated(true);
          }
        } catch (error) {
          console.error('Translation failed:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      detectAndTranslate();
    }
  }, [text, userLanguage, isAutoTranslateEnabled, originalLanguage, detectLanguage, translateText]);

  const handleToggleTranslation = async (e: React.MouseEvent) => {
    // Prevent event bubbling to parent links
    e.preventDefault();
    e.stopPropagation();
    
    if (isTranslated) {
      // Show original text
      setDisplayedText(originalText);
      setIsTranslated(false);
      setIsLoading(false);
    } else {
      // Show translated text
      setIsLoading(true);
      try {
        // Ensure we have the original language
        let sourceLanguage = originalLanguage;
        if (!sourceLanguage) {
          sourceLanguage = await detectLanguage(text);
          setOriginalLanguage(sourceLanguage);
        }
        
        // Only translate if we're not already showing the translated text
        const translated = await translateText(text);
        
        // Update the displayed text and mark as translated
        setDisplayedText(translated);
        setIsTranslated(true);
      } catch (error) {
        console.error('Translation toggle failed:', error);
        // On error, keep showing the original text
        setDisplayedText(originalText);
        setIsTranslated(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <Component className={`${isLoading ? 'opacity-50' : ''}`}>
        {displayedText}
      </Component>
      
      {showControls && originalLanguage && originalLanguage !== userLanguage && (
        <div className="mt-1 flex items-center text-xs gap-0.5">
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 flex items-center gap-0.5 text-muted-foreground/80 border-muted-foreground/20">
            <LuGlobe className="w-3 h-3" />
            {isTranslated ? 'Translated' : 'Original'}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 px-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground hover:bg-transparent"
            onClick={handleToggleTranslation}
            disabled={isLoading}
          >
            {isTranslated ? 'Show original' : 'Translate'}
          </Button>
          
          {isExpanded && (
            <div className="absolute top-full left-0 z-10 mt-1 p-2 bg-white dark:bg-dark-bg-800 rounded-md shadow-md border">
              <div className="text-xs">
                <div className="font-medium mb-1">Original ({getLanguageName(originalLanguage)}):</div>
                <div>{originalText}</div>
                
                <div className="font-medium mb-1 mt-2">Translated ({getLanguageName(userLanguage)}):</div>
                <div>{isTranslated ? displayedText : '(Not translated yet)'}</div>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-0.5 text-muted-foreground/80 hover:text-foreground hover:bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <LuChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  );
} 