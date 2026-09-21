import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from "./context/DataContext";
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider> {/* 2. Wrap your App component inside it */}
      <App />
    </DataProvider>
  </React.StrictMode>
);