import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/noto-serif-tc/400.css';
import '@fontsource/noto-serif-tc/600.css';
import App from './App';
import type { RenderState } from './render-state';
import './styles.css';

const initial: RenderState | undefined = JSON.parse(document.getElementById('__TFC_DATA__')?.textContent || 'null') ?? undefined;
const root = document.getElementById('root')!;
const app = (
  <React.StrictMode>
    <BrowserRouter><App initial={initial} /></BrowserRouter>
  </React.StrictMode>
);
if (initial && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
