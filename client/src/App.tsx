import "./App.css";
import { StarknetProvider } from "./stores/provider";
import { EthereumProvider } from "./stores/ethereumProvider";
import { WalletDashboard } from "./components/WalletDashboard";

function App() {
  return (
    <EthereumProvider>
      <StarknetProvider>
        <WalletDashboard />
      </StarknetProvider>
    </EthereumProvider>
  );
}

export default App;
