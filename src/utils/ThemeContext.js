import { Appearance, StyleSheet, Text, View } from 'react-native'
import React, { createContext, useEffect, useState } from 'react'


const colors = {
  light: {
    background: 'white',
    textcolor: 'black',
    viewcolor:'rgba(255, 255, 255, 1)',
    card: '#f5f5f5',    // NEW
    inputBg: 'rgba(255, 255, 255, 1)',
    borderColor: '#ddd',
    btncolor:'#F5F5F5'
  },
  dark: {
    background: '#121212',
    textcolor: 'white',
    viewcolor: 'rgba(26, 31, 36, 1)',
    card: '#1a1a1a',     // NEW
    inputBg: 'rgba(26, 31, 36, 1)',
    borderColor: '#444',
    btncolor:'#2E2E2E'
  }
};
export const themecontext = createContext();

export const ThemeProvider = ({ children }) => {

  const colorscheme = Appearance.getColorScheme();
  
  const [theme, setTheme] = useState(colorscheme === 'dark' ? colors.dark : colors.light);

  useEffect(()=>{
    const subscribe = Appearance.addChangeListener(({colorScheme})=>{
      setTheme(colorScheme === 'dark' ? colors.dark : colors.light)
    })
    return () => subscribe.remove();
  },[])

  const toggleTheme = () => {
    setTheme(theme === colors.light ? colors.dark : colors.light)
  }

  return (
    <themecontext.Provider value={{ theme, toggleTheme }}>
      {children}
    </themecontext.Provider>
  )
}