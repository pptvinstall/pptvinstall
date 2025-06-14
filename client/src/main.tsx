import React from 'react';
import { createRoot } from "react-dom/client";
import { Route, Router, Switch } from 'wouter';
import HomePage from '@/pages/index';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route>404 - Page Not Found</Route>
      </Switch>
    </Router>
  </React.StrictMode>
);