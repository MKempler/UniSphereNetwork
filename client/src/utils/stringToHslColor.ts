export default function stringToHslColor(str: string, hue = 0.18, lightness = 0.92) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const s = 0.6; // pastel
  const h = (hash % 360) / 360 + hue;
  return `hsl(${Math.floor(h * 360)}, ${Math.floor(s * 100)}%, ${Math.floor(lightness * 100)}%)`;
} 