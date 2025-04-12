import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

const NoStockSelected = () => {
  useEffect(() => {
    // Prevent body and HTML from scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Ensure full height of the page
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';

    // Cleanup: Re-enable scroll when the component is unmounted
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.height = 'auto';
      document.body.style.height = 'auto';
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-300"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-12 h-12 mb-4 text-blue-500 animate-pulse" />
        <h2 className="text-xl font-semibold mb-2">No Stock Selected</h2>
        <p className="text-sm max-w-xs">
          Select a stock from the sidebar to view detailed information and analytics.
        </p>
      </div>
    </motion.div>
  );
};

export default NoStockSelected;
