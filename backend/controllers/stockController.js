const axios = require('axios');
const yfinance = require('yahoo-finance2').default;
const { fetch_risk_results } = require('../utils/riskAnalysis');
// API Configuration
const FMP_API_KEY = process.env.FMP_API_KEY || 'YOUR_FMP_API_KEY'; // Add this to your .env file
const BASE_URL = 'https://financialmodelingprep.com/api';
const portfolioCache = [];

// Get a single stock by symbol
const getStockBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    // Fetch stock details directly from API, without relying on cached data
    const stockData = await getStockDetails(symbol);

    if (!stockData) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.status(200).json(stockData);
  } catch (error) {
    console.error(`Error fetching stock ${req.params.symbol}:`, error);
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
};

// Get insights for a specific stock
const getStockInsights = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    // Fetch historical data directly from API for insights
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const historical = await yfinance.historical(symbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
    }).catch(err => {
      console.warn(`Warning: Could not fetch historical data for ${symbol}:`, err);
      return [];
    });

    if (!historical || historical.length === 0) {
      return res.status(404).json({ message: 'Historical stock data not found' });
    }

    // Generate insights
    let insights = { symbol, trends: [] };

    // Calculate simple moving averages
    const recentData = historical.slice(-30); // Last 30 data points

    // Calculate 7-day average
    if (recentData.length >= 7) {
      const avg7Day = recentData.slice(-7).reduce((sum, item) => sum + item.close, 0) / 7;
      insights.trends.push({
        type: '7-day average',
        value: avg7Day.toFixed(2),
      });
    }

    // Calculate 30-day average if available
    if (recentData.length >= 30) {
      const avg30Day = recentData.reduce((sum, item) => sum + item.close, 0) / 30;
      insights.trends.push({
        type: '30-day average',
        value: avg30Day.toFixed(2),
      });
    }

    // Add volume trend
    if (recentData.length >= 7) {
      const avgVolume = recentData.slice(-7).reduce((sum, item) => sum + (item.volume || 0), 0) / 7;
      insights.trends.push({
        type: 'Average 7-day volume',
        value: Math.round(avgVolume).toLocaleString(),
      });
    }

    // Basic recommendation based on recent performance
    if (recentData.length >= 10) {
      const latest = recentData[recentData.length - 1];
      const tenDaysAgo = recentData[recentData.length - 10];

      if (latest.close > tenDaysAgo.close) {
        const percentGain = ((latest.close - tenDaysAgo.close) / tenDaysAgo.close) * 100;
        insights.recommendation = {
          action: percentGain > 5 ? 'Hold' : 'Buy',
          reason: `Stock has gained ${percentGain.toFixed(2)}% in the last 10 trading days.`,
        };
      } else {
        const percentLoss = ((tenDaysAgo.close - latest.close) / tenDaysAgo.close) * 100;
        insights.recommendation = {
          action: percentLoss > 8 ? 'Buy' : 'Hold',
          reason: `Stock has lost ${percentLoss.toFixed(2)}% in the last 10 trading days.`,
        };
      }
    }

    // Add market sentiment
    try {
      insights.sentiment = await fetchStockSentiment(symbol);
    } catch (error) {
      console.error(`Error fetching sentiment for ${symbol}:`, error);
      insights.sentiment = { overall_prediction: 'Neutral', confidence: 50 };
    }

    res.status(200).json(insights);
  } catch (error) {
    console.error(`Error generating insights for ${req.params.symbol}:`, error);
    res.status(500).json({ message: 'Error generating insights', error: error.message });
  }
};

// Also updating getAllStocks to be more flexible with the searchQuery
const getAllStocks = async (req, res) => {
  try {
    // Check if a search query was provided
    const searchQuery = req.query.query?.trim();
    
    // If there's a search query, use searchStocks logic instead
    if (searchQuery) {
      // Redirect to the search function with the same query
      req.query.name = searchQuery;
      return searchStocks(req, res);
    }
    
    // If no search query, continue with the default symbols
    const defaultSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NFLX', 'NVDA'];
    const stocks = [];

    const promises = defaultSymbols.map(async (symbol) => {
      try {
        // Fetch stock quote data
        const quote = await yfinance.quote(symbol);

        // Fetch stock summary profile for industry and sector data
        const summary = await yfinance.quoteSummary(symbol, { modules: ['assetProfile', 'summaryProfile'] });

        // Extract profile data (industry, sector, etc.)
        const profile = summary?.assetProfile || summary?.summaryProfile || {};

        // Push stock data to the stocks array
        stocks.push({
          symbol: symbol,
          name: quote.displayName || quote.shortName || symbol,
          lastClose: quote.regularMarketPrice || null,
          industry: profile.industry || 'Unknown',
          sector: profile.sector || 'Unknown',
        });
      } catch (err) {
        console.error(`Error fetching data for ${symbol}:`, err);
      }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Send the stocks array as response
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: 'Error fetching stocks', error: error.message });
  }
};

const searchStocks = async (req, res) => {
  try {
    const query = req.query.name?.trim();

    if (!query) {
      return res.status(400).json({ error: 'Please provide a valid stock name or symbol' });
    }

    // Use the Financial Modeling Prep API to search across ALL available stocks
    const search_url = `${BASE_URL}/v3/search-ticker`;
    const params = {
      query: query,
      limit: 20, // Increased limit for more results
      apikey: FMP_API_KEY,
    };

    // Get the search results from FMP API
    const response = await axios.get(search_url, { params });
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return res.status(200).json([]);
    }

    // For each search result, fetch additional data
    const stocksPromises = response.data.map(async (item) => {
      try {
        // Try to fetch more details using yfinance
        const quote = await yfinance.quote(item.symbol).catch(() => null);
        
        return {
          symbol: item.symbol,
          name: quote?.shortName || item.name || item.symbol,
          lastClose: quote?.regularMarketPrice || null,
          industry: item.exchangeShortName || 'Unknown', // Temporary value until profile is loaded
          sector: 'Finance', // Default sector for now
          exchange: item.exchange || 'Unknown',
        };
      } catch (err) {
        console.error(`Error fetching detailed data for ${item.symbol}:`, err);
        // Return basic search result if details fetch fails
        return {
          symbol: item.symbol,
          name: item.name || item.symbol,
          lastClose: null,
          industry: 'Unknown',
          sector: 'Unknown',
          exchange: item.exchange || 'Unknown',
        };
      }
    });

    // Use Promise.allSettled to handle any potential API errors for individual stocks
    const results = await Promise.allSettled(stocksPromises);
    const stocks = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    res.status(200).json(stocks);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred while searching for stocks',
      details: error.message 
    });
  }
};
// Helper functions

// Fetch stock details from external APIs
async function getStockDetails(symbol) {
  try {
    // Initialize default response structure
    const stockDetails = {
      symbol: symbol,
      current_quote: {
        price: 0.0,
        change: 0.0,
        change_percent: 0.0,
      },
      profile: {
        name: 'Unknown',
        symbol: symbol,
        industry: 'Unknown',
        sector: 'Unknown',
        country: 'Unknown',
        website: '#',
      },
      historical_prices: [],
      news: [],
    };

    // Parallel API requests
    const [quote, companyProfile, historical] = await Promise.all([
      yfinance.quote(symbol),
      yfinance.quoteSummary(symbol, { modules: ['assetProfile', 'summaryProfile'] }).catch(() => null),
      yfinance.historical(symbol, {
        period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period2: new Date().toISOString().split('T')[0],
      }).catch(() => []),
    ]);

    // Company Profile
    if (companyProfile) {
      const profile = companyProfile.assetProfile || companyProfile.summaryProfile || {};
      stockDetails.profile.name = quote.shortName || quote.longName || 'Unknown';
      stockDetails.profile.industry = profile.industry || 'Unknown';
      stockDetails.profile.sector = profile.sector || 'Unknown';
      stockDetails.profile.country = profile.country || 'Unknown';
      stockDetails.profile.website = profile.website || '#';
    }

    // Current Quote
    if (quote) {
      stockDetails.current_quote = {
        price: quote.regularMarketPrice || 0.0,
        change: quote.regularMarketChange || 0.0,
        change_percent: quote.regularMarketChangePercent || 0.0,
      };
    }

    // Historical Prices
    if (historical && historical.length > 0) {
      stockDetails.historical_prices = historical.map((day) => ({
        date: day.date.toISOString().split('T')[0],
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume,
      }));
    }

    // News from Financial Modeling Prep
    try {
      const newsUrl = `${BASE_URL}/v3/stock_news`;
      const newsResponse = await axios.get(newsUrl, {
        params: {
          tickers: symbol,
          limit: 5,
          apikey: FMP_API_KEY,
        },
      });

      if (newsResponse.data && Array.isArray(newsResponse.data)) {
        stockDetails.news = newsResponse.data.slice(0, 5).map((article) => ({
          title: article.title || '',
          publisher: article.site || '',
          link: article.url || '',
          published_at: article.publishedDate || '',
        }));
      }
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      stockDetails.news = [];
    }

    return stockDetails;
  } catch (error) {
    console.error(`Error fetching stock details for ${symbol}:`, error);
    return null;
  }
}
// Fetch stock sentiment from Python sentiment analysis system
async function fetchStockSentiment(symbol) {
  try {
    // Call the Python sentiment analysis module
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // Assuming the Python file is in a 'sentiment' folder
      const pythonProcess = spawn('python', ['sentiment/sentiment_analyzer.py', symbol]);
      
      let dataString = '';
      
      // Collect data from script output
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      // Handle errors
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python script error: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`Python process exited with code ${code}`);
          // Return a fallback if Python script fails
          resolve({ 
            overall_prediction: 50, 
            overall_sentiment: "Neutral",
            confidence: 50 
          });
        } else {
          try {
            // Parse the output from Python
            // The output format might need adjustment based on what your Python script returns
            const result = JSON.parse(dataString);
            
            // Format the result to match the expected structure
            resolve({
              overall_prediction: result.overall_sentiment || "Neutral",
              confidence: result.overall_prediction || 50,
              news: result.news || []
            });
          } catch (err) {
            console.error("Error parsing Python output:", err);
            // Return fallback if parsing fails
            resolve({ 
              overall_prediction: "Neutral", 
              confidence: 50 
            });
          }
        }
      });
    });
  } catch (error) {
    console.error(`Error in sentiment analysis for ${symbol}:`, error);
    return { overall_prediction: 'Neutral', confidence: 50 };
  }
}
const getStockRiskAnalysis = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    // Call the Python-based risk analysis function
    const riskResults = await fetch_risk_results(symbol, portfolioCache);

    // If there was an error in the risk analysis
    if (riskResults.error) {
      console.warn(`Risk analysis warning for ${symbol}:`, riskResults.error);
      return res.status(200).json({
        error: riskResults.error,
        symbol: symbol
      });
    }

    return res.status(200).json(riskResults);
  } catch (error) {
    console.error(`Error in risk analysis for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      error: 'Unable to perform risk analysis at this time',
      details: error.message
    });
  }
};
module.exports = {
  getAllStocks,
  getStockBySymbol,
  getStockInsights,
  searchStocks,
  getStockRiskAnalysis
};
