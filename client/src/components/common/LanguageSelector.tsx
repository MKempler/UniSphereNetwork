import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LuGlobe, LuCheck } from 'react-icons/lu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Language options - add more as needed
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'da', name: 'Dansk' },
  { code: 'cs', name: 'Čeština' },
  { code: 'hu', name: 'Magyar' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'he', name: 'עברית' },
  { code: 'uk', name: 'Українська' },
  { code: 'ro', name: 'Română' },
  { code: 'bg', name: 'Български' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'sr', name: 'Српски' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'et', name: 'Eesti' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'lt', name: 'Lietuvių' }
];

export default function LanguageSelector() {
  const { 
    userLanguage, 
    setUserLanguage, 
    isAutoTranslateEnabled, 
    toggleAutoTranslate 
  } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <LuGlobe className="h-4 w-4" />
          <span>{LANGUAGES.find(lang => lang.code === userLanguage)?.name || userLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Language Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-translate" 
              checked={isAutoTranslateEnabled}
              onCheckedChange={toggleAutoTranslate}
            />
            <Label htmlFor="auto-translate">Auto-translate content</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically translate posts in languages different from your preferred language
          </p>
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Select language</DropdownMenuLabel>
        
        <div className="max-h-[300px] overflow-y-auto">
          {LANGUAGES.map((language) => (
            <DropdownMenuItem
              key={language.code}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setUserLanguage(language.code)}
            >
              <span>{language.name}</span>
              {userLanguage === language.code && (
                <LuCheck className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 