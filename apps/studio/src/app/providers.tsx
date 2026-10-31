'use client';

import { DirectionProvider } from '@playora/ui/components/foundations/direction/direction';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

// Suppress false-positive React 19 warning triggered by next-themes injecting an inline script in client render
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DirectionProvider locale="vi">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
