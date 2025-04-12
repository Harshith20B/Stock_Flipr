import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStockStore } from "../store/useStockStore";
import { Plus, Minus, Search } from "lucide-react";
import { toast } from "react-toastify";

const StockSidebar = () => {
    const {
        stocks,
        getStocks,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSelectedStock,
        selectedStock,
        getWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        industries,
        isLoading: storeLoading
    } = useStockStore();

    const [watchlistSymbols, setWatchlistSymbols] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndustry, setSelectedIndustry] = useState('All');
    const [filteredStocks, setFilteredStocks] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchStocksAndWatchlist();
    }, []);

    useEffect(() => {
        // Update display based on search or regular stock list
        const stocksToFilter = searchQuery ? searchResults : stocks;
        
        if (stocksToFilter && stocksToFilter.length > 0) {
            let filtered = stocksToFilter;

            if (selectedIndustry !== 'All') {
                filtered = filtered.filter(stock => stock.industry === selectedIndustry);
            }

            setFilteredStocks(filtered);
        } else {
            setFilteredStocks([]);
        }
    }, [stocks, searchResults, selectedIndustry, searchQuery]);

    const fetchStocksAndWatchlist = async () => {
        setIsLoading(true);
        try {
            await getStocks();
            const watchlist = await getWatchlist();
            setWatchlistSymbols(watchlist.map(item => item.symbol));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleWatchlist = async (symbol, e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('You must be logged in to manage your watchlist');
                return;
            }

            if (watchlistSymbols.includes(symbol)) {
                await removeFromWatchlist(symbol);
                setWatchlistSymbols(prev => prev.filter(s => s !== symbol));
                toast.success('Removed from watchlist');
            } else {
                await addToWatchlist(symbol);
                setWatchlistSymbols(prev => [...prev, symbol]);
                toast.success('Added to watchlist');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update watchlist');
            console.error('Error updating watchlist:', error);
        }
    };

    const handleStockClick = (stock) => {
        setSelectedStock(stock);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            setSearchQuery(inputValue);
        }
    };

    const handleIndustryChange = (e) => {
        setSelectedIndustry(e.target.value);
    };

    if (isLoading || storeLoading) {
        return (
            <div className="w-80 bg-white dark:bg-gray-900 shadow-lg h-full border-r dark:border-gray-800 p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="w-80 bg-white dark:bg-gray-900 shadow-lg h-full border-r dark:border-gray-800 flex flex-col overflow-y-auto scrollbar-none">
            <div className="p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search stocks..."
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        className="w-full pl-10 p-2 rounded-lg border dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Industry</label>
                    <select
                        value={selectedIndustry}
                        onChange={handleIndustryChange}
                        className="w-full p-2 rounded-lg border dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="All">All</option>
                        {industries.map((industry) => (
                            <option key={industry} value={industry}>{industry}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 px-2 py-2">
                {searchQuery && (
                    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                        <span>Results for: <span className="font-medium">{searchQuery}</span></span>
                        <button 
                            onClick={() => {
                                setInputValue('');
                                setSearchQuery('');
                            }}
                            className="text-blue-500 hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
                
                {filteredStocks.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        {searchQuery.length > 0 ?
                            "No stocks found matching your search." :
                            "No stocks found matching your criteria."
                        }
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {filteredStocks.map((stock) => (
                            <li
                                key={stock.symbol}
                                onClick={() => handleStockClick(stock)}
                                className={`cursor-pointer px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    selectedStock?.symbol === stock.symbol
                                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                                        : ""
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium dark:text-white">{stock.symbol}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</p>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                            ₹{stock.lastClose ?? "N/A"}
                                        </p>
                                        <button
                                            onClick={(e) => toggleWatchlist(stock.symbol, e)}
                                            className={`text-xs flex items-center gap-1 mt-1 ${
                                                watchlistSymbols.includes(stock.symbol)
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-gray-500 dark:text-gray-400"
                                            } hover:underline`}
                                        >
                                            {watchlistSymbols.includes(stock.symbol) ? (
                                                <>
                                                    <Minus className="w-3 h-3" /> Remove
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-3 h-3" /> Watch
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default StockSidebar;