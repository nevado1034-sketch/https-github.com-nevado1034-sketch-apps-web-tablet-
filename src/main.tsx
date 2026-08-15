import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const VERSION_KEY = "litio_tablet_version";

window.addEventListener("error", (e) => {
  try {
    console.error("GLOBAL_ERROR:", e.error || e.message);
  } catch {}
});

window.addEventListener("unhandledrejection", (e) => {
  try {
    console.error("UNHANDLED_REJECTION:", e.reason);
  } catch {}
});

async function checkVersion() {
  try {
    const base = new URL(".", location.href).pathname;
    const res = await fetch(`${base}version.txt?cb=${Date.now()}`);
    if (!res.ok) return;
    const v = (await res.text()).trim();
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored && stored !== v) {
      localStorage.setItem(VERSION_KEY, v);
      location.reload();
    } else if (!stored) {
      localStorage.setItem(VERSION_KEY, v);
    }
  } catch (e) {}
}

checkVersion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
