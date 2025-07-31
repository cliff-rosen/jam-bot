import { useEffect, useState } from 'react';
import { Brain, Zap, Target, CheckCircle } from 'lucide-react';

interface ExtractionAnimationProps {
  isVisible: boolean;
  featuresCount: number;
  articlesCount: number;
}

export function ExtractionAnimation({ isVisible, featuresCount, articlesCount }: ExtractionAnimationProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const phases = [
    { icon: Brain, label: 'Analyzing Articles', color: 'text-blue-500' },
    { icon: Zap, label: 'Extracting Features', color: 'text-purple-500' },
    { icon: Target, label: 'Processing Data', color: 'text-orange-500' },
    { icon: CheckCircle, label: 'Finalizing Results', color: 'text-green-500' }
  ];

  useEffect(() => {
    if (!isVisible) {
      setCurrentPhase(0);
      setProgress(0);
      return;
    }

    // Simulate phases
    const phaseInterval = setInterval(() => {
      setCurrentPhase(prev => (prev + 1) % phases.length);
    }, 2000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0; // Reset for continuous animation
        return prev + Math.random() * 3;
      });
    }, 100);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible, phases.length]);

  if (!isVisible) return null;

  const CurrentIcon = phases[currentPhase].icon;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border p-8 max-w-md w-full mx-4 relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-orange-900/20 opacity-50" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          {/* Main Icon with Pulse Animation */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative">
              <CurrentIcon className="w-10 h-10 text-white" />
              
              {/* Pulse Rings */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-400/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-purple-400/20 animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Phase Label */}
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            AI Feature Extraction
          </h3>
          
          <p className={`text-sm font-medium mb-4 transition-colors duration-500 ${phases[currentPhase].color}`}>
            {phases[currentPhase].label}
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{articlesCount}</div>
              <div>Articles</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-purple-600 dark:text-purple-400">{featuresCount}</div>
              <div>Features</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Dynamic Message */}
          <p className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
            Processing {articlesCount} articles with advanced AI models...
          </p>

          {/* Feature Icons Animation */}
          <div className="flex justify-center mt-4 gap-2">
            {[...Array(featuresCount)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-50 animate-bounce"
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}