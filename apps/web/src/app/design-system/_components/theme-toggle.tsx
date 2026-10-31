'use client';

import { Button } from '@playora/ui/components/button';
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
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="gap-2"
    >
      {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
      <span>{dark ? 'Chế độ tối (Dark)' : 'Chế độ sáng (Light)'}</span>
    </Button>
  );
}
