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
        setSelectedStock,
        selectedStock,
        getWatchlist,
        addToWatchlist,
        removeFromWatchlist
    } = useStockStore();

    const [watchlistSymbols, setWatchlistSymbols] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredStocks, setFilteredStocks] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStocksAndWatchlist();
    }, []);

    // Filter stocks based on search query
    useEffect(() => {
        if (stocks && stocks.length > 0) {
            const filtered = stocks.filter(stock => 
                stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredStocks(filtered);
        }
    }, [stocks, searchQuery]);

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
                // Remove from watchlist
                await removeFromWatchlist(symbol);
                setWatchlistSymbols(prev => prev.filter(s => s !== symbol));
                toast.success('Removed from watchlist');
            } else {
                // Add to watchlist
                await addToWatchlist(symbol);
                setWatchlistSymbols(prev => [...prev, symbol]);
                toast.success('Added to watchlist');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update watchlist');
            console.error('Error updating watchlist:', error);
        }
    };

    const handleStockClick = (stock) => {
        setSelectedStock(stock);
        // Navigate to home page to show stock details
        navigate('/');
    };

    if (isLoading) {
        return (
            <div className="w-80 bg-white dark:bg-gray-900 shadow-lg h-full border-r dark:border-gray-800 p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div
            className="w-80 bg-white dark:bg-gray-900 shadow-lg h-full border-r dark:border-gray-800 flex flex-col"
            style={{
                overflowY: 'auto',
                scrollbarWidth: 'none',       // Firefox
                msOverflowStyle: 'none'       // IE/Edge
            }}
        >
            <style jsx="true">{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            <div className="p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search stocks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 p-2 rounded-lg border dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
                {filteredStocks.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        No stocks found matching "{searchQuery}"
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