import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { GymProvider } from './store';
import './styles.css';

registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root');
}

createRoot(root).render(
  <StrictMode>
    <GymProvider>
      <App />
    </GymProvider>
  </StrictMode>,
);
