'use client';

import { applyThemeWithTransition } from '@playora/ui/components/application/theme/theme-toggle';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Moon, Sun } from '@playora/ui/icons';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = !dark;
    setDark(next);
    const pointerOrigin =
      event.clientX !== 0 && event.clientY !== 0 ? { x: event.clientX, y: event.clientY } : null;
    void applyThemeWithTransition(next ? 'dark' : 'light', {
      origin: pointerOrigin,
      element: event.currentTarget,
    });
  };

  return (
    <Button
      variant="secondary"
      size="small"
      leadingIcon={dark ? Sun : Moon}
      onClick={toggle}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      {dark ? 'Chế độ tối (Dark)' : 'Chế độ sáng (Light)'}
    </Button>
  );
}
