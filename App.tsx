
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/merchant/Login.tsx';
import Dashboard from './pages/merchant/Dashboard.tsx';
import ProjectConfig from './pages/merchant/ProjectConfig.tsx';
import Profile from './pages/merchant/Profile.tsx';
import ClientGuide from './pages/client/ClientGuide.tsx';
import { useStore } from './store.ts';

const App: React.FC = () => {
  try {
    const { auth } = useStore();

    return (
      <HashRouter>
        <Routes>
          {/* Merchant Routes */}
          <Route path="/login" element={!auth.isLoggedIn ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={auth.isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/project/:id" element={auth.isLoggedIn ? <ProjectConfig /> : <Navigate to="/login" />} />
          <Route path="/profile" element={auth.isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
          
          {/* Client Routes */}
          <Route path="/guide/:id" element={<ClientGuide />} />
          
          {/* Fallback */}
          <Route path="/" element={<Navigate to={auth.isLoggedIn ? "/dashboard" : "/login"} />} />
        </Routes>
      </HashRouter>
    );
  } catch (error) {
    console.error("App error:", error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>App initialization error</h1>
        <p>{error?.toString()}</p>
      </div>
    );
  }
};

export default App;
