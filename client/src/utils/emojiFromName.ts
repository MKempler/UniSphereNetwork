const emojis = ['💡','🌍','🎶','📷','📰','🎮','⚙️','🍳','🚀','🧠'];

export const emojiFromName = (str: string = ''): string => 
  emojis[str.charCodeAt(0) % emojis.length]; 