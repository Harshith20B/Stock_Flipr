import React from 'react';
import StockSidebar from './StockSidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="h-full w-full flex overflow-hidden">
      <StockSidebar />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;