import React from 'react';
import { emojiFromName } from '@/utils/emojiFromName';

interface CircuitHeroProps {
  name: string;
  description?: string;
  subscribed: boolean;
  onToggle: () => void;
}

// Helper function to generate HSL color from string
const stringToHslColor = (str: string = '', saturation = 60, lightness = 70): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const CircuitHero: React.FC<CircuitHeroProps> = ({ 
  name = 'Circuit', 
  description, 
  subscribed, 
  onToggle 
}) => {
  console.log('[CircuitHero] Rendering with subscribed:', subscribed, 'Name:', name);
  const color1 = stringToHslColor(name, 60, 70);
  const color2 = stringToHslColor(name + 'x', 60, 68);
  const emoji = emojiFromName(name);

  return (
    <div 
      className="relative rounded-t-2xl overflow-hidden w-full" 
      style={{ 
        background: `linear-gradient(135deg, ${color1}, ${color2})`, 
        height: '140px',
      }}
    >
      <div className="absolute bottom-4 left-6 flex items-center justify-center bg-white/20 backdrop-blur-sm w-[72px] h-[72px] rounded-full">
        <span className="text-4xl" role="img" aria-label={`Circuit ${name} emoji`}>
          {emoji}
        </span>
      </div>

      <button
        onClick={onToggle}
        className={`fixed bottom-4 right-4 sm:absolute sm:bottom-4 sm:right-6 px-5 py-2 rounded-full border
                    ${subscribed 
                      ? 'border-green-500 text-green-600' 
                      : 'border-primary-500 text-primary-500'
                    }
                    bg-white/70 backdrop-blur hover:bg-white transition-all z-10`}
      >
        {subscribed ? 'Subscribed ✓' : 'Subscribe'}
      </button>
    </div>
  );
};

export default CircuitHero; 