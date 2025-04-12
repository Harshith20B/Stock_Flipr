import { AlertTriangle, Zap, BarChart2, Activity, TrendingUp, TrendingDown, Crosshair } from "lucide-react";

const RiskAnalysis = ({ stockSymbol, riskData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-2" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Risk Analysis</h3>
        </div>
        <div className="flex justify-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  if (!riskData || riskData.error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-2" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Risk Analysis</h3>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">
            {riskData?.error || "Unable to load risk analysis data for this stock."}
          </p>
        </div>
      </div>
    );
  }

  // Determine color and icon based on risk level
  const getRiskLevelStyles = (level) => {
    switch(level) {
      case "High":
        return {
          bgColor: "bg-red-100 dark:bg-red-900",
          textColor: "text-red-800 dark:text-red-200",
          borderColor: "border-red-200 dark:border-red-800",
          icon: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        };
      case "Medium":
        return {
          bgColor: "bg-amber-100 dark:bg-amber-900",
          textColor: "text-amber-800 dark:text-amber-200",
          borderColor: "border-amber-200 dark:border-amber-800",
          icon: <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        };
      case "Low":
        return {
          bgColor: "bg-green-100 dark:bg-green-900",
          textColor: "text-green-800 dark:text-green-200",
          borderColor: "border-green-200 dark:border-green-800",
          icon: <BarChart2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        };
      default:
        return {
          bgColor: "bg-gray-100 dark:bg-gray-900",
          textColor: "text-gray-800 dark:text-gray-200",
          borderColor: "border-gray-200 dark:border-gray-800",
          icon: <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        };
    }
  };

  const riskStyles = getRiskLevelStyles(riskData.risk_level);
  
  // Determine trend icon
  const getTrendIcon = (trend) => {
    if (trend?.includes("Bullish")) {
      return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
    } else if (trend?.includes("Bearish")) {
      return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
    return <Crosshair className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-2" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Risk Analysis</h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {riskData.analysis_timestamp || 'N/A'}
        </div>
      </div>

      {/* Risk Summary Section */}
      <div className="mb-6">
        <div className={`flex items-center p-4 rounded-lg ${riskStyles.bgColor} ${riskStyles.borderColor} border`}>
          <div className="mr-4">
            {riskStyles.icon}
          </div>
          <div>
            <h4 className={`text-lg font-bold ${riskStyles.textColor}`}>
              {riskData.risk_level} Risk
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              Volatility: {riskData.volatility} | Confidence: {riskData.confidence_score}
            </p>
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Trend Analysis</h4>
          <div className="flex items-center">
            {getTrendIcon(riskData.trend)}
            <span className="ml-2 text-lg font-semibold">{riskData.trend || 'Unknown'}</span>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">RSI Status</h4>
          <p className="text-lg font-semibold">
            {riskData.rsi_status} ({riskData.rsi_value})
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">MACD Signal</h4>
          <p className="text-lg font-semibold">
            {riskData.macd_signal || 'N/A'}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Price Position</h4>
          <p className="text-lg font-semibold">
            {riskData.price_position || 'N/A'}
          </p>
        </div>
      </div>

      {/* Recommendations */}
      {riskData.recommendations && riskData.recommendations.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Recommendations</h4>
          <ul className="space-y-2">
            {riskData.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;