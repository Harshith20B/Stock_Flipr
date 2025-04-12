import { useEffect, useRef, useState } from "react";
import { useStockStore } from "../store/useStockStore";
import RiskAnalysis from "./RiskAnalysis";
import { Button } from "../components/ui/button";

import { Plus, Pencil, Trash, FileText } from "lucide-react";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  BarChart4, 
  Calendar,
  TrendingDown,
  Globe,
  AlertCircle,
  Briefcase,
  Download
} from "lucide-react";
import NoStockSelected from "./NoStockSelected";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

const StockDetails = () => {
  const {
    selectedStock,
    stockDetails,
    stockInsights,
    riskData,  // New state property
    isStockDetailsLoading,
    isInsightsLoading,
    isRiskLoading, // New loading state
    getStockDetails,
    getStockInsights,
    getRiskAnalysis, // New function to fetch risk analysis
  } = useStockStore();

  const detailsEndRef = useRef(null);
  const [activeTimeframe, setActiveTimeframe] = useState("1M"); // 1W, 1M, 3M, 6M, 1Y, ALL
  const [activePriceTab, setActivePriceTab] = useState("price"); // price, volume, comparison
  const [showFullTable, setShowFullTable] = useState(false);

  useEffect(() => {
    if (selectedStock && selectedStock.symbol) {
      getStockDetails(selectedStock.symbol);
      getStockInsights(selectedStock.symbol);
      getRiskAnalysis(selectedStock.symbol);
    }
  }, [selectedStock, getStockDetails, getStockInsights, getRiskAnalysis]);

  // useEffect(() => {
  //   if (detailsEndRef.current) {
  //     detailsEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [stockDetails]);

  if (isStockDetailsLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4 border-b bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Loading stock details...
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!selectedStock) {
    return <NoStockSelected />;
  }

  if (!stockDetails || !stockDetails.profile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4 border-b bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {selectedStock.symbol}
          </h2>
          {/* Notes Button Group */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => console.log("Add Note")}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log("Update Note")}>
              <Pencil className="w-4 h-4 mr-1" />
              Update
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log("Remove Note")}>
              <Trash className="w-4 h-4 mr-1" />
              Remove
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log("Get Notes")}>
              <FileText className="w-4 h-4 mr-1" />
              View Notes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter historical data based on selected timeframe
  const getFilteredHistoricalData = () => {
    if (!stockDetails.historical_prices || stockDetails.historical_prices.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate = new Date();
    
    switch (activeTimeframe) {
      case "1W":
        startDate.setDate(now.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "ALL":
      default:
        return stockDetails.historical_prices;
    }

    return stockDetails.historical_prices.filter(item => {
      return new Date(item.date) >= startDate;
    });
  };

  const filteredData = getFilteredHistoricalData();
  
  // Format data for charts
  const chartData = filteredData.map(item => ({
    date: new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
    close: item.close,
    open: item.open,
    high: item.high, 
    low: item.low,
    volume: item.volume
  }));
  
  // Calculate price change
  const latest = stockDetails.current_quote || {};
  const priceChange = latest.change_percent || 0;
  const isPriceUp = priceChange >= 0;
  
  // Calculate key metrics
  const calculateMetrics = () => {
    if (!chartData || chartData.length === 0) return {};
    
    const prices = chartData.map(d => d.close);
    const highs = chartData.map(d => d.high);
    const lows = chartData.map(d => d.low);
    
    // Simple moving averages
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length);
    
    // Relative Strength
    const firstPrice = prices[0] || 0;
    const lastPrice = prices[prices.length - 1] || 0;
    const percentChange = firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    
    // Volatility - standard deviation of daily returns
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      dailyReturns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const squaredDiffs = dailyReturns.map(r => Math.pow(r - avgReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const volatility = Math.sqrt(variance) * 100; // as percentage
    
    // Average volume
    const volumes = chartData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    // Highest high and lowest low
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    return {
      sma20: sma20.toFixed(2),
      sma50: sma50.toFixed(2),
      percentChange: percentChange.toFixed(2),
      volatility: volatility.toFixed(2),
      avgVolume: Math.round(avgVolume).toLocaleString(),
      highestHigh: highestHigh.toFixed(2),
      lowestLow: lowestLow.toFixed(2),
    };
  };
  
  const metrics = calculateMetrics();

  const handleExportData = () => {
    // Create CSV content
    const headers = ["Date", "Open", "High", "Low", "Close", "Volume"];
    const csvContent = [
      headers.join(","),
      ...stockDetails.historical_prices.map(day => {
        return [
          day.date,
          day.open,
          day.high,
          day.low,
          day.close,
          day.volume
        ].join(",");
      })
    ].join("\n");
    
    // Create download link
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedStock.symbol}_historical_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Sticky Header with improved styling */}
      <div className="p-6 border-b bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center flex-wrap gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              {stockDetails.profile.name || selectedStock.symbol}
            </h2>
            <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {selectedStock.symbol}
            </span>
            {latest && (
              <span className={`text-lg font-semibold ${isPriceUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${latest.price?.toFixed(2) || 0}
              </span>
            )}
          </div>
          
          {latest && (
            <div className="mt-2 md:mt-0 flex items-center">
              {isPriceUp ? (
                <ArrowUpCircle className="h-5 w-5 text-green-500 mr-1" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${isPriceUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPriceUp ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Note Buttons Row */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => console.log("Add Note")}>
            <Plus className="w-4 h-4" /> Add Note
          </button>
          <button className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => console.log("Update Note")}>
            <Pencil className="w-4 h-4" /> Update
          </button>
          <button className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => console.log("Remove Note")}>
            <Trash className="w-4 h-4" /> Remove
          </button>
          <button className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => console.log("View Notes")}>
            <FileText className="w-4 h-4" /> View Notes
          </button>
        </div>
      </div>


      {/* Scrollable Details with visual improvements */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-gray-800 dark:text-gray-200">
        {/* Price Chart Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 md:mb-0">Price Chart</h3>
            <div className="inline-flex items-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex space-x-1">
                <button 
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activePriceTab === 'price' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActivePriceTab('price')}
                >
                  Price
                </button>
                <button 
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activePriceTab === 'volume' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActivePriceTab('volume')}
                >
                  Volume
                </button>
                <button 
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activePriceTab === 'candle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActivePriceTab('candle')}
                >
                  OHLC
                </button>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-center md:justify-start space-x-2 overflow-x-auto pb-2">
              {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map((timeframe) => (
                <button
                  key={timeframe}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTimeframe === timeframe ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActiveTimeframe(timeframe)}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {activePriceTab === 'price' && (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (chartData.length > 30) {
                        // Show fewer ticks for large datasets
                        return value.includes("1") || value.includes("15") ? value : "";
                      }
                      return value;
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Price']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#0088FE" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              )}
              
              {activePriceTab === 'volume' && (
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (chartData.length > 30) {
                        return value.includes("1") || value.includes("15") ? value : "";
                      }
                      return value;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                  />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), 'Volume']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar dataKey="volume" fill="#8884d8" />
                </BarChart>
              )}
              
              {activePriceTab === 'candle' && (
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (chartData.length > 30) {
                        return value.includes("1") || value.includes("15") ? value : "";
                      }
                      return value;
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, '']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="open" stroke="#82ca9d" name="Open" dot={false} />
                  <Line type="monotone" dataKey="close" stroke="#8884d8" name="Close" dot={false} />
                  <Line type="monotone" dataKey="high" stroke="#82ca9d" name="High" dot={false} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="low" stroke="#8884d8" name="Low" dot={false} strokeDasharray="3 3" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Profile Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Company Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> <span className="font-medium">{stockDetails.profile.name}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Symbol:</span> <span className="font-medium">{selectedStock.symbol}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Sector:</span> <span className="font-medium">{stockDetails.profile.sector}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Industry:</span> <span className="font-medium">{stockDetails.profile.industry}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Country:</span> <span className="font-medium">{stockDetails.profile.country}</span></div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Website:</span> 
                <a href={stockDetails.profile.website} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline font-medium flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  Visit Website
                </a>
              </div>
            </div>
          </div>

          {/* Market Metrics Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Key Metrics</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">20-Day MA:</span>
                <span className="font-medium">${metrics.sma20}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">50-Day MA:</span>
                <span className="font-medium">${metrics.sma50}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Period % Change:</span>
                <span className={`font-medium ${parseFloat(metrics.percentChange) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {parseFloat(metrics.percentChange) >= 0 ? '+' : ''}{metrics.percentChange}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Volatility:</span>
                <span className="font-medium">{metrics.volatility}%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Avg. Volume:</span>
                <span className="font-medium">{metrics.avgVolume}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">52-Week High:</span>
                <span className="font-medium text-green-600 dark:text-green-400">${metrics.highestHigh}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">52-Week Low:</span>
                <span className="font-medium text-red-600 dark:text-red-400">${metrics.lowestLow}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Sentiment */}
        {stockInsights && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Market Sentiment & Insights</h3>
            </div>
            
            {isInsightsLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sentiment Badge */}
                {stockInsights.sentiment && (
                  <div className="flex items-center mb-4">
                    <span className="text-gray-600 dark:text-gray-400 mr-2">Overall Sentiment:</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      stockInsights.sentiment.overall_prediction === 'Bullish' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : stockInsights.sentiment.overall_prediction === 'Bearish'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {stockInsights.sentiment.overall_prediction}
                      {stockInsights.sentiment.confidence && (
                        <span className="ml-1 text-xs">({stockInsights.sentiment.confidence}% confidence)</span>
                      )}
                    </span>
                  </div>
                )}
                
                {/* Trends */}
                {stockInsights.trends && stockInsights.trends.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {stockInsights.trends.map((trend, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{trend.type}</h4>
                        <p className="text-lg font-semibold">{trend.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Recommendation */}
                {stockInsights.recommendation && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-start">
                      <div className={`rounded-full p-2 mr-3 ${
                        stockInsights.recommendation.action === 'Buy' 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : stockInsights.recommendation.action === 'Sell'
                            ? 'bg-red-100 dark:bg-red-900'
                            : 'bg-yellow-100 dark:bg-yellow-900'
                      }`}>
                        {stockInsights.recommendation.action === 'Buy' && <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />}
                        {stockInsights.recommendation.action === 'Sell' && <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
                        {stockInsights.recommendation.action === 'Hold' && <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                      </div>
                      <div>
                        <h4 className={`text-lg font-bold ${
                          stockInsights.recommendation.action === 'Buy' 
                            ? 'text-green-600 dark:text-green-400' 
                            : stockInsights.recommendation.action === 'Sell'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {stockInsights.recommendation.action}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {stockInsights.recommendation.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <RiskAnalysis 
          stockSymbol={selectedStock?.symbol}
          riskData={riskData}
          isLoading={isRiskLoading}
        />
        {/* Recent News */}
        {stockDetails.news && stockDetails.news.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Recent News</h3>
            <div className="space-y-4">
              {stockDetails.news.map((item, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg p-2 -mx-2"
                  >
                    <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400 mb-1 hover:underline">
                      {item.title}
                    </h4>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium mr-2">{item.publisher}</span>
                      <span>
                        {new Date(item.published_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
          {/* <div ref={detailsEndRef}></div> */}
        </div>
      </div>
    );
};
            
export default StockDetails;