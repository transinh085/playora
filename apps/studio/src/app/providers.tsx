'use client';

import { Toaster } from '@playora/ui/components/sonner';
import { StudioProvider } from '@playora/ui/providers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { useState } from 'react';

function StudioThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
  return <StudioProvider mode={mode}>{children}</StudioProvider>;
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
      <StudioThemeBridge>
        <QueryClientProvider client={queryClient}>
          {children}
          {/* TODO(X1): remove once no feature imports sonner */}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </StudioThemeBridge>
    </ThemeProvider>
  );
}
