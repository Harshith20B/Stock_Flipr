// controllers/watchlistController.js
const User = require('../models/User');
const axios = require('axios');
const yfinance = require('yahoo-finance2').default;

// API Configuration
const FMP_API_KEY = process.env.FMP_API_KEY || 'YOUR_FMP_API_KEY'; // Add this to your .env file
const BASE_URL = 'https://financialmodelingprep.com/api';

// Get user's watchlist with detailed stock information
const getWatchlist = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find user and populate with watchlist symbols
    const user = await User.findById(userId).select('watchlist');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If watchlist is empty, return empty array
    if (!user.watchlist || user.watchlist.length === 0) {
      return res.status(200).json({ watchlist: [] });
    }
    
    // Extract symbols from user's watchlist
    const symbols = user.watchlist.map(item => item.symbol);
    
    // Fetch current stock details for each watchlist item
    const watchlistWithDetails = [];
    
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yfinance.quote(symbol);
          
          if (quote) {
            watchlistWithDetails.push({
              symbol: symbol,
              name: quote.shortName || quote.longName || symbol,
              price: quote.regularMarketPrice || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              lastUpdated: new Date()
            });
          }
        } catch (error) {
          console.error(`Error fetching details for ${symbol}:`, error);
          // Add basic info if API call fails
          watchlistWithDetails.push({
            symbol: symbol,
            name: symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            lastUpdated: new Date()
          });
        }
      })
    );
    
    res.status(200).json({ 
      watchlist: watchlistWithDetails
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// Add stock to watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { symbol } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if stock already exists in watchlist
    const stockExists = user.watchlist.some(item => item.symbol === symbol);
    
    if (stockExists) {
      return res.status(400).json({ message: 'Stock already in watchlist' });
    }
    
    // Verify the stock exists by fetching its details from Yahoo Finance
    try {
      const quote = await yfinance.quote(symbol);
      
      if (!quote) {
        return res.status(404).json({ message: 'Stock not found' });
      }
      
      // Add stock to watchlist
      user.watchlist.push({
        symbol,
        addedAt: Date.now()
      });
      
      await user.save();
      
      // Return the stock information
      res.status(200).json({ 
        message: 'Stock added to watchlist',
        stock: {
          symbol: symbol,
          name: quote.shortName || quote.longName || symbol,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error(`Error verifying stock ${symbol}:`, error);
      return res.status(404).json({ message: 'Unable to verify stock symbol' });
    }
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// Remove stock from watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params;
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if stock exists in watchlist
    const stockIndex = user.watchlist.findIndex(item => item.symbol === symbol);
    
    if (stockIndex === -1) {
      return res.status(404).json({ message: 'Stock not found in watchlist' });
    }
    
    // Remove stock from watchlist
    user.watchlist.splice(stockIndex, 1);
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Stock removed from watchlist'
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
};