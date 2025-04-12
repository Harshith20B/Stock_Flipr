import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  setSearchQuery: (query) => set({ searchQuery: query }),
  setIndustries: (industryList) => set({ industries: industryList }),

  setSelectedStock: (stock) => {
    set({ selectedStock: stock });
    if (stock?.symbol) {
      get().getStockDetails(stock.symbol);
      get().getStockInsights(stock.symbol);
      get().getStockHistory(stock.symbol);
    }
  },

  getStocks: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/api/stocks`);
      const stocks = res.data;

      // Extract industries
      const industriesSet = new Set(stocks.map(stock => stock.industry).filter(Boolean));
      set({
        stocks,
        industries: Array.from(industriesSet).sort(),
        isLoading: false
      });

      return stocks;
    } catch (err) {
      console.error('getStocks error:', err);
      set({ error: err.message, isLoading: false });
      return [];
    }
  },

  getStockDetails: async (symbol) => {
    set({ isStockDetailsLoading: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/api/stocks/${symbol}`);
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
      const res = await axios.get(`${API_URL}/api/stocks/${symbol}/insights`);
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
      const res = await axios.get(`${API_URL}/api/stocks/${symbol}/history`, { headers });
      set({ stockHistory: res.data.history || res.data, isHistoryLoading: false });
      return res.data;
    } catch (err) {
      console.error('getStockHistory error:', err);
      set({ error: err.message, isHistoryLoading: false });
      return [];
    }
  },

  searchStocks: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/api/stocks/search?name=${query}`);
      set({ searchResults: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      console.error('searchStocks error:', err);
      set({ error: err.message, isLoading: false });
      return [];
    }
  },

  getWatchlist: async () => {
    set({ isWatchlistLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const res = await axios.get(`${API_URL}/api/watchlist`, {
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

      const res = await axios.post(`${API_URL}/api/watchlist`, 
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

      const res = await axios.delete(`${API_URL}/api/watchlist/${symbol}`, {
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

  clearSearchResults: () => set({ searchResults: [] }),

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
