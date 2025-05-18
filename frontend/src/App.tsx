import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// contexts
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { JamBotProvider } from './context/JamBotContext';

// utils
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';
// components
import TopBar from './components/TopBar';
import LoginForm from './components/auth/LoginForm';
import EmailAuthSuccess from './pages/EmailAuthSuccess';
import Profile from './pages/Profile';
import { Toaster } from './components/ui/toaster';
import JamBotPage from './pages/JamBot';

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error: authError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Set up session expiry handler
  useEffect(() => {
    setStreamSessionExpiredHandler(handleSessionExpired);
    return () => setStreamSessionExpiredHandler(() => { });
  }, [handleSessionExpired]);

  // Main app content when authenticated - defined inside App to ensure context is available
  const AuthenticatedApp = () => {
    return (
      <div className="h-screen flex flex-col dark:bg-gray-900 bg-gray-50">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            {/* <Route path="/" element={<Navigate to="/workflows" />} /> */}
            <Route path="/" element={<Navigate to="/jam-bot" />} />

            {/* Jam Bot routes */}
            <Route path="/jam-bot" element={<JamBotPage />} />

            {/* Email auth routes */}
            <Route path="/email/auth/success" element={<EmailAuthSuccess />} />

            {/* Profile route */}
            <Route path="/profile" element={<Profile />} />

            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
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