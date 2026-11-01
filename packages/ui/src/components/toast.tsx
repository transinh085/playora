'use client';

import {
  type HeroUIToastOptions,
  toast as heroToast,
  Toast,
  ToastProvider,
  type ToastProviderProps,
} from '@heroui/react';
import type { ReactNode } from 'react';

type ExtendedToast = typeof heroToast & {
  error: (message: ReactNode, options?: Omit<HeroUIToastOptions, 'variant'>) => string;
};

export const toast: ExtendedToast = Object.assign(heroToast, {
  error: heroToast.danger,
});

export function Toaster(props: ToastProviderProps) {
  return <Toast.Provider {...props} />;
}

export { type HeroUIToastOptions, Toast, ToastProvider, type ToastProviderProps };
