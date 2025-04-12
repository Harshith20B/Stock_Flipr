import React from 'react';
import StockSidebar from './StockSidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-950 transition-colors duration-500 ease-in-out">
      <div className="flex flex-1 overflow-hidden">
        <StockSidebar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
