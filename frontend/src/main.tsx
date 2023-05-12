import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  OpenAPI,
} from './client';
import './index.css';

OpenAPI.BASE = import.meta.env.VITE_BBE2_API_URL;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
