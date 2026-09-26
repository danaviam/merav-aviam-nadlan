import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { applyA11y, loadA11y } from './a11y';
import './styles.css';

// מחילים את הגדרות הנגישות לפני הציור הראשון, כדי שהעמוד לא "יקפוץ"
applyA11y(loadA11y());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
