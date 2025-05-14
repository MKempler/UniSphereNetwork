// This service handles translation of content using an API

interface TranslationResponse {
  translatedText: string;
  detectedSourceLanguage: string;
}

export async function translateText(text: string, targetLanguage: string = 'en'): Promise<TranslationResponse> {
  try {
    // For the MVP, we'll use a simulated translation service
    // In production, this would connect to Google Translate API or similar
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback translation for demo purposes
    return {
      translatedText: text,
      detectedSourceLanguage: 'en',
    };
  }
}

export function getLanguageTag(languageCode: string): string {
  // Map language codes to display names
  const languageMap: Record<string, string> = {
    'en': 'EN',
    'es': 'ES',
    'fr': 'FR',
    'de': 'DE',
    'zh': 'ZH',
    'ja': 'JP',
    'ko': 'KO',
    'ar': 'AR',
    'hi': 'HI',
    'pt': 'PT',
    'ru': 'RU',
  };
  
  return languageMap[languageCode.toLowerCase()] || languageCode.toUpperCase();
}

export function detectLanguage(text: string): Promise<string> {
  // In a real implementation, this would use a language detection API
  // For the MVP, we'll use a simplified detection
  return fetch('/api/detect-language', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
    .then(response => response.json())
    .then(data => data.language)
    .catch(() => 'en'); // Default to English on error
}
