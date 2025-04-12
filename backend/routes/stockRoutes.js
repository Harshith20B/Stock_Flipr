const express = require('express');
const {
  getAllStocks,
  getStockBySymbol,
  getStockInsights,
  searchStocks,
  getStockRiskAnalysis  // New controller function
} = require('../controllers/stockController');

const router = express.Router();

// Get all stocks for the sidebar
router.get('/', getAllStocks);
router.get('/search', searchStocks);

// Get detailed data for a specific stock
router.get('/:symbol', getStockBySymbol);

// Get insights for a specific stock
router.get('/:symbol/insights', getStockInsights);

// Get risk analysis for a specific stock - NEW ROUTE
router.get('/:symbol/risk-analysis', getStockRiskAnalysis);

module.exports = router;