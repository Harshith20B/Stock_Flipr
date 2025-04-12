import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_URL
});

export const useStockStore = create((set, get) => ({
  stocks: [],
  selectedStock: null,
  stockDetails: null,
  stockInsights: null,
  stockHistory: [],
  isLoading: false,
  isStockDetailsLoading: false,
  isInsightsLoading: false,
  isHistoryLoading: false,
  error: null,
  searchQuery: '',
  searchResults: [],
  watchlist: [],
  isWatchlistLoading: false,
  industries: [],
  riskData: null,
  isRiskLoading: false,

  getRiskAnalysis: async (symbol) => {
    set({ isRiskLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/api/stocks/${symbol}/risk-analysis`);
      set({
        riskData: res.data,
        isRiskLoading: false
      });
      return res.data;
    } catch (err) {
      console.error('getRiskAnalysis error:', err);
      set({
        riskData: { error: "Failed to fetch risk data." },
        isRiskLoading: false,
        error: err.message
      });
      return null;
    }
  },
  
  // These are the specific functions you need to modify in your useStockStore.js file

// Update this function in your useStockStore.js
searchStocks: async (query) => {
  if (!query || query.length < 2) {
    console.log("Search query too short:", query);
    return set({ searchResults: [] });
  }

  set({ isLoading: true, error: null });
  try {
    console.log("Making API request to search stocks:", query);
    const searchUrl = `/api/stocks/search?name=${encodeURIComponent(query)}`;
    console.log("Search URL:", searchUrl);
    
    const res = await axiosInstance.get(searchUrl);
    console.log("Raw API search response:", res.data);
    
    const filtered = res.data.filter(
      stock => stock?.lastClose !== null && stock?.lastClose !== undefined && !isNaN(stock.lastClose)
    );
    
    console.log("Filtered search results:", filtered);
    console.log("Filtered out", res.data.length - filtered.length, "stocks with invalid lastClose");

    set({
      searchResults: filtered,
      isLoading: false
    });

    return filtered;
  } catch (err) {
    console.error('searchStocks error:', err);
    set({ error: err.message, isLoading: false });
    return [];
  }
},

setSearchQuery: (query) => {
  set({ searchQuery: query });
  
  // Only search if query is not empty
  if (query.trim() !== '') {
    get().searchStocks(query);
  } else {
    // Just clear search results when search is cleared
    set({ searchResults: [] });
  }
},
  setIndustries: (industryList) => set({ industries: industryList }),

  setSelectedStock: (stock) => {
    set({ selectedStock: stock });
    if (stock?.symbol) {
      get().getStockDetails(stock.symbol);
      get().getStockInsights(stock.symbol);
      get().getStockHistory(stock.symbol);
    }
  },

  getStocks: async (query = '') => {
    set({ isLoading: true, error: null });
    try {
      let url = '/api/stocks';
      if (query) {
        url += `?query=${encodeURIComponent(query)}`;
      }
  
      const res = await axiosInstance.get(url);
      const stocks = res.data;
  
      // Filter out stocks without valid price details
      const validStocks = stocks.filter(
        stock => stock?.lastClose !== null && stock?.lastClose !== undefined && !isNaN(stock.lastClose)
      );
  
      const industriesSet = new Set(validStocks.map(stock => stock.industry).filter(Boolean));
  
      set({
        stocks: validStocks,
        industries: Array.from(industriesSet).sort(),
        isLoading: false
      });
  
      return validStocks;
    } catch (err) {
      console.error('getStocks error:', err);
      set({ error: err.message, isLoading: false });
      return [];
    }
  },
  

  getStockDetails: async (symbol) => {
    set({ isStockDetailsLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/api/stocks/${symbol}`);
      set({ stockDetails: res.data, isStockDetailsLoading: false });
      return res.data;
    } catch (err) {
      console.error('getStockDetails error:', err);
      set({ error: err.message, isStockDetailsLoading: false });
      return null;
    }
  },

  getStockInsights: async (symbol) => {
    set({ isInsightsLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/api/stocks/${symbol}/insights`);
      set({ stockInsights: res.data, isInsightsLoading: false });
      return res.data;
    } catch (err) {
      console.error('getStockInsights error:', err);
      set({ error: err.message, isInsightsLoading: false });
      return null;
    }
  },

  getStockHistory: async (symbol) => {
    set({ isHistoryLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axiosInstance.get(`/api/stocks/${symbol}/history`, { headers });
      set({ stockHistory: res.data.history || res.data, isHistoryLoading: false });
      return res.data;
    } catch (err) {
      console.error('getStockHistory error:', err);
      set({ error: err.message, isHistoryLoading: false });
      return [];
    }
  },

  // Select a stock from search results
  selectSearchResult: (stock) => {
    set({ selectedStock: stock });
    if (stock?.symbol) {
      get().getStockDetails(stock.symbol);
      get().getStockInsights(stock.symbol);
      get().getStockHistory(stock.symbol);
    }
  },

  getWatchlist: async () => {
    set({ isWatchlistLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const res = await axiosInstance.get(`/api/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const watchlistData = res.data.watchlist || res.data || [];
      set({ watchlist: watchlistData, isWatchlistLoading: false });
      return watchlistData;
    } catch (err) {
      console.error('getWatchlist error:', err);
      set({ watchlist: [], error: err.message, isWatchlistLoading: false });
      return [];
    }
  },

  addToWatchlist: async (symbol) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in');

      const res = await axiosInstance.post(
        `/api/watchlist`, 
        { symbol },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await get().getWatchlist();
      return res.data;
    } catch (err) {
      console.error('addToWatchlist error:', err);
      set({ error: err.message });
      throw err;
    }
  },

  removeFromWatchlist: async (symbol) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in');

      const res = await axiosInstance.delete(`/api/watchlist/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await get().getWatchlist();
      return res.data;
    } catch (err) {
      console.error('removeFromWatchlist error:', err);
      set({ error: err.message });
      throw err;
    }
  },

  isInWatchlist: (symbol) => {
    const { watchlist } = get();
    return watchlist.some((item) => item.symbol === symbol);
  },

  clearSelectedStock: () => {
    set({ selectedStock: null, stockDetails: null, stockInsights: null, stockHistory: [] });
  },

  clearError: () => set({ error: null }),

  clearSearchResults: () => {
    set({ searchResults: [], searchQuery: '' });
    get().getStocks(); // Reset to default stocks
  },

  refreshCurrentStock: async () => {
    const { selectedStock } = get();
    if (selectedStock?.symbol) {
      await get().getStockDetails(selectedStock.symbol);
      await get().getStockInsights(selectedStock.symbol);
      await get().getStockHistory(selectedStock.symbol);
    }
  },

  toggleFavorite: (symbol) => {
    const updated = get().stocks.map(stock =>
      stock.symbol === symbol ? { ...stock, isFavorite: !stock.isFavorite } : stock
    );
    set({ stocks: updated });
  }
}));