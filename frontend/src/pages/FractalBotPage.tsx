import React from 'react';
import FractalBot from '../components/fractal-bot/FractalBot';
import { FractalBotProvider } from '../context/FractalBotContext';

const FractalBotPage: React.FC = () => {
    return (
        <FractalBotProvider>
            <FractalBot />
        </FractalBotProvider>
    );
};

export default FractalBotPage; 