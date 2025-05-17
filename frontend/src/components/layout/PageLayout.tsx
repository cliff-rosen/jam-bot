import React, { ReactNode } from 'react';

interface PageLayoutProps {
    children: ReactNode;
}

/**
 * A standard page layout component
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
    return (
        <div className="container mx-auto px-4 py-6">
            {children}
        </div>
    );
};

export default PageLayout; 