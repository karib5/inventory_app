import React from 'react';
import { Backpack, Box, Footprints, Gem, Glasses, GraduationCap, Shirt, Watch } from 'lucide-react';

type IconType = React.ComponentType<{ size?: number }>;

// Keyword match against the area's own name - purely cosmetic, never
// affects behavior. Falls back to a generic box for anything unmatched,
// which keeps this subtle rather than gimmicky.
const KEYWORD_ICONS: Array<[RegExp, IconType]> = [
  [/shirt|cloth|apparel|jacket|hoodie|sweater/i, Shirt],
  [/shoe|foot|sneaker|boot/i, Footprints],
  [/cap|hat|headwear/i, GraduationCap],
  [/watch/i, Watch],
  [/glass|eyewear/i, Glasses],
  [/jewel|ring|gem/i, Gem],
  [/bag|backpack/i, Backpack],
];

export function getAreaIcon(name: string): IconType {
  for (const [pattern, Icon] of KEYWORD_ICONS) {
    if (pattern.test(name)) return Icon;
  }
  return Box;
}

export default function AreaIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = getAreaIcon(name);
  return <Icon size={size} />;
}
