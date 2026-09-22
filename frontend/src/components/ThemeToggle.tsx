import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, getInitialTheme, persistTheme, Theme } from '../theme';

export default function ThemeToggle({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  const [theme, setTheme] = React.useState<Theme>(() => getInitialTheme());

  React.useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
    </button>
  );
}
