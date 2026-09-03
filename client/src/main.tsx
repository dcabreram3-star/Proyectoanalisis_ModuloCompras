import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { NotificationsProvider } from './shared/Notifications';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  </React.StrictMode>
);