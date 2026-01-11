
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomeDashboard from './views/HomeDashboard';
import TilesOrderView from './views/TilesOrderView';
import ReportsDashboard from './views/ReportsDashboard';
import SOEntryView from './views/SOEntryView';
import InvoiceView from './views/InvoiceView';
import AdvanceDueView from './views/AdvanceDueView';
import LoginView from './views/LoginView';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    // Check for existing session
    const auth = localStorage.getItem('tiles_erp_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    // Small delay to prevent flash if checking takes time (instant here, but good practice)
    setIsAuthChecking(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('tiles_erp_auth', 'true');
    setIsAuthenticated(true);
  };

  if (isAuthChecking) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="bg-slate-50 min-h-screen relative overflow-x-hidden safe-top safe-bottom">
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/invoice" element={<InvoiceView />} />
          <Route path="/tiles-order" element={<TilesOrderView />} />
          <Route path="/so-entry" element={<SOEntryView />} />
          <Route path="/reports" element={<ReportsDashboard />} />
          <Route path="/advance-due" element={<AdvanceDueView />} />
          <Route path="*" element={<HomeDashboard />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
