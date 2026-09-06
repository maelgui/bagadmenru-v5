import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import env from './env';
import './index.css';

// Register service worker for push notifications. The API base URL is passed
// as a query parameter because the service worker cannot read window.env.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const apiUrl = encodeURIComponent(env.VITE_BBE2_API_URL);
    navigator.serviceWorker.register(`/sw.js?apiUrl=${apiUrl}`).catch((error: unknown) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}

// Only report to Sentry from production builds: local dev errors are noise.
// import.meta.env.PROD decides *whether* to init; VITE_ENVIRONMENT (injected at
// runtime via window.env, mirroring the backend's ENVIRONMENT) decides which
// environment tag beta vs production errors carry. Falls back to 'development'
// when unset (empty string after envsubst, or absent in local dev).
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'https://7433cee9b0a5720226161fdcab710d8e@o1008469.ingest.us.sentry.io/4508480032800768',
    environment: env.VITE_ENVIRONMENT || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Sample a fraction of transactions: 100% is unnecessary volume in production.
    tracesSampleRate: 0.2,
    // Attach trace headers only to our own API calls (same origin, /api path).
    tracePropagationTargets: [/^https:\/\/(beta\.|prod\.)?bagadmenru\.bzh\/api/],
    // Session Replay: 10% of sessions, 100% of sessions with an error.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
