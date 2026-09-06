import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

/* HashRouter rather than BrowserRouter: it works unchanged on a static host
 * served from a subpath (GitHub Pages) and on Vercel, with no server rewrite
 * rules and no 404 on a deep link refresh. */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
