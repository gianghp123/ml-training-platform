const CATEGORY_COLOR_PALETTE = [
  { tw: 'bg-blue-500', hex: '#3b82f6' },
  { tw: 'bg-amber-500', hex: '#f59e0b' },
  { tw: 'bg-green-500', hex: '#22c55e' },
  { tw: 'bg-purple-500', hex: '#a855f7' },
  { tw: 'bg-rose-500', hex: '#f43f5e' },
  { tw: 'bg-cyan-500', hex: '#06b6d4' },
  { tw: 'bg-orange-500', hex: '#f97316' },
  { tw: 'bg-pink-500', hex: '#ec4899' },
];

export function getCategoryColor(categoryId: string): typeof CATEGORY_COLOR_PALETTE[number] {
  let hash = 0;
  for (const char of categoryId) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return CATEGORY_COLOR_PALETTE[Math.abs(hash) % CATEGORY_COLOR_PALETTE.length];
}
