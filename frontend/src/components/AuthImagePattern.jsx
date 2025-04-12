const AuthImagePattern = ({ title, subtitle }) => {
    const stockData = [
      { symbol: "AAPL", change: "+1.52%" },
      { symbol: "TSLA", change: "-0.87%" },
      { symbol: "INFY", change: "+2.34%" },
      { symbol: "GOOG", change: "-1.12%" },
      { symbol: "RELI", change: "+0.98%" },
      { symbol: "AMZN", change: "+1.10%" },
      { symbol: "TCS", change: "-0.72%" },
      { symbol: "MSFT", change: "+1.44%" },
      { symbol: "HDFCB", change: "-0.55%" },
    ];
  
    return (
      <div className="hidden lg:flex items-center justify-center bg-base-200 p-6 mt-0">
        <div className="max-w-sm text-center">
          <div className="grid grid-cols-3 gap-4 mb-10">
            {stockData.map((stock, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 shadow-md flex flex-col items-center justify-center ${
                  stock.change.includes("+")
                    ? "bg-green-100 text-green-800 animate-pulse"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <div className="text-lg font-bold">{stock.symbol}</div>
                <div className="text-sm">{stock.change}</div>
              </div>
            ))}
          </div>
          <h2 className="text-3xl font-bold mb-3">{title}</h2>
          <p className="text-base text-base-content/60">{subtitle}</p>
        </div>
      </div>
    );
  };
  
  export default AuthImagePattern;
  