import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/noto-serif-tc/700.css';
import '@fontsource/noto-serif-tc/900.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/500.css';
import '@fontsource/noto-sans-tc/700.css';
import App from './App';
import type { RenderState } from './render-state';
import './styles.css';
import './guideline.css';
import { basePath } from './paths';

const initial: RenderState | undefined = JSON.parse(document.getElementById('__TFC_DATA__')?.textContent || 'null') ?? undefined;
const root = document.getElementById('root')!;
const app = (
  <React.StrictMode>
    <BrowserRouter basename={basePath || undefined}><App initial={initial} /></BrowserRouter>
  </React.StrictMode>
);
if (initial && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
