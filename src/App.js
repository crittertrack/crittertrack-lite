import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './contexts/ThemeContext';
import { registerNativePush, initNativePushListeners } from './utils/nativePush';
import { prefetchAppData } from './utils/prefetchOfflineData';
import { warmImageCache } from './utils/offlineImageCache';
import Login from './pages/Login';
import Register from './pages/Register';
import MyAnimals from './pages/MyAnimals';
import Collections from './pages/Collections';
import AnimalDetail from './pages/AnimalDetail';
import Enclosures from './pages/Enclosures';
import Breeding from './pages/Breeding';
import PublicSearch from './pages/PublicSearch';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import BottomNav from './components/BottomNav';
import BrandHeader from './components/BrandHeader';
import OfflineBanner from './components/OfflineBanner';
import SyncFailureBanner from './components/SyncFailureBanner';

function App() {
  const { authToken, userProfile, loading, login, logout, completeAuth, refreshProfile } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Reserve space for the status bar instead of letting it overlay the header.
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: isDark ? '#000000' : '#D27096' });
    StatusBar.setStyle({ style: Style.Light });
  }, [isDark]);

  useEffect(() => {
    if (!authToken) return;
    let cleanup = () => {};
    (async () => {
      cleanup = await initNativePushListeners(authToken);
      await registerNativePush();
    })();
    return () => cleanup();
  }, [authToken]);

  // Load all the core data (and photos) into the offline cache as soon as the user is signed
  // in — up front, not lazily whenever a tab happens to get opened — so offline mode works
  // immediately even for tabs never visited yet. Re-runs on reconnect so the cache stays fresh.
  const wasOnlineRef = useRef(true);
  useEffect(() => {
    if (!authToken) return;
    prefetchAppData();
    const onNetworkStatus = (e) => {
      if (e.detail.online && !wasOnlineRef.current) prefetchAppData();
      wasOnlineRef.current = e.detail.online;
    };
    window.addEventListener('api-network-status', onNetworkStatus);
    return () => window.removeEventListener('api-network-status', onNetworkStatus);
  }, [authToken]);

  useEffect(() => {
    if (userProfile?.profileImage) warmImageCache(userProfile.profileImage);
  }, [userProfile?.profileImage]);

  if (loading) {
    return (
      <>
        <OfflineBanner />
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      </>
    );
  }

  if (!authToken) {
    return (
      <>
        <OfflineBanner />
        {showRegister
          ? <Register onRegistered={completeAuth} onBack={() => setShowRegister(false)} />
          : <Login onLogin={login} onShowRegister={() => setShowRegister(true)} />}
      </>
    );
  }

  const showNav = !location.pathname.startsWith('/animals/') && location.pathname !== '/search' && location.pathname !== '/profile' && location.pathname !== '/notifications';

  return (
    <div className="App">
      <OfflineBanner />
      {showNav && <BrandHeader userProfile={userProfile} onLogout={logout} authToken={authToken} />}
      <Routes>
        <Route path="/" element={<Navigate to="/animals" replace />} />
        <Route path="/animals" element={<MyAnimals authToken={authToken} />} />
        <Route path="/animals/:id" element={<AnimalDetail authToken={authToken} userProfile={userProfile} />} />
        <Route path="/collections" element={<Collections authToken={authToken} />} />
        <Route path="/enclosures" element={<Enclosures authToken={authToken} />} />
        <Route path="/breeding" element={<Breeding authToken={authToken} userProfile={userProfile} />} />
        <Route path="/search" element={<PublicSearch authToken={authToken} />} />
        <Route path="/profile" element={<Profile authToken={authToken} userProfile={userProfile} onProfileUpdated={refreshProfile} onLogout={logout} />} />
        <Route path="/notifications" element={<Notifications authToken={authToken} />} />
        <Route path="*" element={<Navigate to="/animals" replace />} />
      </Routes>
      {showNav && <BottomNav />}
      <SyncFailureBanner />
    </div>
  );
}

export default App;
