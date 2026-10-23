import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom theme keys from styles.css; otherwise `text-stage-xl` is read as a
// colour and silently dropped next to `text-game-fg`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['stage-sm', 'stage-base', 'stage-lg', 'stage-xl', 'stage-2xl', 'stage-hero'],
      font: ['display', 'game'],
      radius: ['game'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
