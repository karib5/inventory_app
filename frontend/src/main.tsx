import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { applyTheme, getInitialTheme } from './theme';

applyTheme(getInitialTheme());

createRoot(document.getElementById('root')!).render(<App />);
