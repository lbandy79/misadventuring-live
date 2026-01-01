import { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { getTheme, themeToCSSVars } from './themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState('fantasy');
  const [theme, setTheme] = useState(getTheme('fantasy'));

  // Listen to theme changes from Firebase (admin can change it)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'theme'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.themeId) {
            setThemeId(data.themeId);
            setTheme(getTheme(data.themeId));
          }
        }
      },
      (error) => {
        console.warn('Theme listener error, using default:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Apply CSS custom properties to document root
  useEffect(() => {
    const cssVars = themeToCSSVars(theme);
    Object.entries(cssVars).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  }, [theme]);

  const value = {
    themeId,
    theme,
    setThemeId: (id) => {
      setThemeId(id);
      setTheme(getTheme(id));
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
