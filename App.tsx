
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/merchant/Login.tsx';
import VersionSelect from './pages/merchant/VersionSelect.tsx';
import Dashboard from './pages/merchant/Dashboard.tsx';
import ProjectConfig from './pages/merchant/ProjectConfig.tsx';
import Profile from './pages/merchant/Profile.tsx';
import ClientGuide from './pages/client/ClientGuide.tsx';
import TextGuide from './pages/client/TextGuide.tsx';
import { useStore } from './store.ts';

const App: React.FC = () => {
  try {
    const { auth } = useStore();

    return (
      <HashRouter>
        <Routes>
          {/* Merchant Routes */}
          <Route path="/login" element={!auth.isLoggedIn ? <Login /> : <Navigate to={auth.guideMode ? "/dashboard" : "/version-select"} />} />
          <Route path="/version-select" element={auth.isLoggedIn ? <VersionSelect /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={auth.isLoggedIn && auth.guideMode ? <Dashboard /> : <Navigate to={auth.isLoggedIn ? "/version-select" : "/login"} />} />
          <Route path="/project/:id" element={auth.isLoggedIn && auth.guideMode ? <ProjectConfig /> : <Navigate to={auth.isLoggedIn ? "/version-select" : "/login"} />} />
          <Route path="/profile" element={auth.isLoggedIn && auth.guideMode ? <Profile /> : <Navigate to={auth.isLoggedIn ? "/version-select" : "/login"} />} />
          
          {/* Client Routes */}
          <Route path="/guide/:id" element={auth.guideMode === 'text' ? <TextGuide /> : <ClientGuide />} />
          
          {/* Fallback */}
          <Route path="/" element={<Navigate to={auth.isLoggedIn ? (auth.guideMode ? "/dashboard" : "/version-select") : "/login"} />} />
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
