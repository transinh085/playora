'use client';

import { applyThemeWithTransition, Button } from '@playora/ui/components';
import { Moon, Sun } from '@playora/ui/icons';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    void applyThemeWithTransition(next ? 'dark' : 'light');
  };

  const Icon = dark ? Sun : Moon;

  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={toggle}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      <Icon className="size-4" aria-hidden />
      {dark ? 'Chế độ tối (Dark)' : 'Chế độ sáng (Light)'}
    </Button>
  );
}
