import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPanel from './adminPanel/AdminPanel';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AdminPanel />
  </React.StrictMode>
);
