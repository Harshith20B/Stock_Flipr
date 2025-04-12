import { useStockStore } from "../store/useStockStore";
import NoStockSelected from "../components/NoStockSelected";
import StockDetails from "../components/StockDetails";

const HomePage = () => {
  const { selectedStock } = useStockStore();

  return (
    <div className="h-full w-full">
      {!selectedStock ? <NoStockSelected /> : <StockDetails />}
    </div>
  );
};

export default HomePage;