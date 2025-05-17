import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// contexts
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { WorkflowProvider, useWorkflows } from './context/WorkflowContext';
import { PromptTemplateProvider } from './context/PromptTemplateContext';
import { JobsProvider } from './context/JobsContext';

// utils
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';
// components
import TopBar from './components/TopBar';
import LoginForm from './components/auth/LoginForm';
import WorkflowsManager from './pages/WorkflowsManager';
import Workflow from './pages/Workflow';
import PromptTemplateManager from './pages/PromptTemplateManager';
import FilesManager from './pages/FilesManager';
import PromptTemplate from './pages/PromptTemplate';
import JobsManager from './pages/JobsManager';
import Job from './pages/Job';
import AgentWorkflowPage from './pages/AgentWorkflow';
import TestPage from './pages/TestPage';
import InteractiveWorkflowTest from './components/interactive-workflow/InteractiveWorkflowTest';
import FractalBotPage from './pages/FractalBotPage';
import EmailAuthSuccess from './pages/EmailAuthSuccess';
import Profile from './pages/Profile';
import { Toaster } from './components/ui/toaster';

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
    const {
      isLoading,
      error,
      workflow,
      loadWorkflow
    } = useWorkflows();
    const location = useLocation();

    // Handle navigation and workflow state
    useEffect(() => {
      console.log("App.tsx: location.pathname", location.pathname);
      const match = location.pathname.match(/^\/workflow\/([^/]+)/);
      if (match) {
        const workflowId = match[1];
        // Only load from DB if we don't have this workflow or have a different one
        if (!workflow || (workflow.workflow_id !== workflowId && workflowId !== 'new')) {
          loadWorkflow(workflowId);
        }
      }
    }, [location.pathname, workflow, loadWorkflow]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
          <div className="text-center space-y-8">
            {/* Flowing Dots Animation */}
            <div className="relative px-8">
              <div className="flex space-x-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full 
                                      bg-blue-500 
                                      ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900
                                      dark:bg-blue-400
                                      animate-pulse`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              Loading...
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
          <div className="text-center space-y-4">
            <div className="text-xl font-semibold text-red-600 dark:text-red-400">
              Error
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              {error}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-50">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <Routes>
            {/* <Route path="/" element={<Navigate to="/workflows" />} /> */}
            <Route path="/" element={<Navigate to="/fractal-bot" />} />

            {/* Fractal Bot routes */}
            <Route path="/fractal-bot" element={<FractalBotPage />} />

            {/* Workflow routes
            <Route path="/workflows" element={<WorkflowsManager />} />
            <Route path="/workflows/:id" element={<Workflow />} />
            <Route path="/workflow/:id" element={<Workflow />} />

            {/* Prompt template routes with multiple path patterns */}
            <Route path="/prompt-templates" element={<PromptTemplateManager />} />
            <Route path="/prompts" element={<PromptTemplateManager />} />
            <Route path="/prompt-template/:id" element={<PromptTemplate />} />
            <Route path="/prompt/:id" element={<PromptTemplate />} />

            {/* File routes */}
            <Route path="/files" element={<FilesManager />} />

            {/* Job routes */}
            {/* <Route path="/jobs" element={<JobsManager />} />
            <Route path="/jobs/:id" element={<Job />} />
            <Route path="/job/:id" element={<Job />} /> */}

            {/* Test routes */}
            <Route path="/agent-workflow" element={<AgentWorkflowPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/interactive-workflow" element={<InteractiveWorkflowTest />} />

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
        <WorkflowProvider>
          <PromptTemplateProvider>
            <JobsProvider>
              <AuthenticatedApp />
              <Toaster />
            </JobsProvider>
          </PromptTemplateProvider>
        </WorkflowProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 