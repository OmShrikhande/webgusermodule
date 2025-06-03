import React, { createContext, useContext, useState } from 'react';
import { Colors } from '@/constants/Colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Provide the right color palette
  const themeColors = darkMode ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}