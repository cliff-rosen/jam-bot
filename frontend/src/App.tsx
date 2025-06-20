import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';

// contexts
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { JamBotProvider } from './context/JamBotContext';

// utils
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';

// components
import TopBar from './components/TopBar';
import { LoginForm } from './components/features/auth';
import EmailAuthSuccess from './pages/EmailAuthSuccess';
import Profile from './pages/Profile';
import JamBotPage from './pages/JamBot';
import LabPage from './pages/Lab';

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error: authError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Set up session expiry handler
  useEffect(() => {
    setStreamSessionExpiredHandler(handleSessionExpired);
    return () => setStreamSessionExpiredHandler(() => { });
  }, [handleSessionExpired]);

  // Main app content when authenticated
  const AuthenticatedApp = () => {
    return (
      <div className="h-screen flex flex-col dark:bg-gray-900 bg-gray-50">
        <TopBar />
        <main className="flex-1 overflow-y-auto pt-16">
          <Routes>
            <Route path="/" element={<Navigate to="/jam-bot" />} />
            <Route path="/jam-bot" element={<JamBotPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/email/auth/success" element={<EmailAuthSuccess />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <LoginForm
              isRegistering={isRegistering}
              setIsRegistering={setIsRegistering}
              login={login}
              register={register}
              error={authError}
            />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <JamBotProvider>
          <AuthenticatedApp />
        </JamBotProvider>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 