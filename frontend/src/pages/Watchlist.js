import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useStockStore } from '../store/useStockStore';

const Watchlist = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add this to check current location
  const { 
    getWatchlist, 
    removeFromWatchlist, 
    setSelectedStock, 
    watchlist,
    isWatchlistLoading 
  } = useStockStore();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('You are not logged in');
        return;
      }
      
      await getWatchlist();
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast.error('Failed to load watchlist data');
    }
  };

  const handleRemoveFromWatchlist = async (symbol, event) => {
    // Prevent row click event from firing
    event.stopPropagation();
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('You are not logged in');
        return;
      }
      
      await removeFromWatchlist(symbol);
      toast.success('Stock removed from watchlist');
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Failed to remove stock from watchlist');
    }
  };

  const handleStockClick = (stock) => {
    // Set the selected stock in the global store
    setSelectedStock({
      symbol: stock.symbol,
      name: stock.name,
      lastClose: stock.price,
      industry: stock.industry // Make sure all needed properties are set
    });
    
    // Always navigate to the home page when a stock is clicked
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  if (isWatchlistLoading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading watchlist...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Your Watchlist</h2>
          
          {!watchlist || watchlist.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Your watchlist is empty.</p>
              <p className="text-gray-600 dark:text-gray-400">Add stocks to your watchlist to monitor them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Change (%)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {watchlist.map(stock => (
                    <tr 
                      key={stock._id || stock.symbol} 
                      onClick={() => handleStockClick(stock)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{stock.symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{stock.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        ₹{typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(stock.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {parseFloat(stock.change || 0) >= 0 ? '+' : ''}
                        {typeof stock.change === 'number' ? stock.change.toFixed(2) : stock.change || '0.00'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={(e) => handleRemoveFromWatchlist(stock.symbol, e)}
                          className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watchlist;