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

// Map of language codes to full language names
export const LANGUAGE_NAMES: Record<string, string> = {
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

export function getLanguageTag(languageCode: string): string {
  // Return the full language name, or the original code if not found
  return LANGUAGE_NAMES[languageCode.toLowerCase()] || languageCode.toUpperCase();
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
