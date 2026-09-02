import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import MyAnimals from './pages/MyAnimals';
import Collections from './pages/Collections';
import AnimalDetail from './pages/AnimalDetail';
import Enclosures from './pages/Enclosures';
import Breeding from './pages/Breeding';
import PublicSearch from './pages/PublicSearch';
import BottomNav from './components/BottomNav';
import BrandHeader from './components/BrandHeader';

function App() {
  const { authToken, userProfile, loading, login, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Reserve space for the status bar instead of letting it overlay the header.
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#D27096' });
    StatusBar.setStyle({ style: Style.Light });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  if (!authToken) {
    return <Login onLogin={login} />;
  }

  const showNav = !location.pathname.startsWith('/animals/') && location.pathname !== '/search';

  return (
    <div className="App">
      {showNav && <BrandHeader userProfile={userProfile} onLogout={logout} />}
      <Routes>
        <Route path="/" element={<Navigate to="/animals" replace />} />
        <Route path="/animals" element={<MyAnimals authToken={authToken} />} />
        <Route path="/animals/:id" element={<AnimalDetail authToken={authToken} userProfile={userProfile} />} />
        <Route path="/collections" element={<Collections authToken={authToken} />} />
        <Route path="/enclosures" element={<Enclosures authToken={authToken} />} />
        <Route path="/breeding" element={<Breeding authToken={authToken} userProfile={userProfile} />} />
        <Route path="/search" element={<PublicSearch authToken={authToken} />} />
        <Route path="*" element={<Navigate to="/animals" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}

export default App;
