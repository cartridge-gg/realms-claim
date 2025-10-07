import "./App.css";
import { StarknetProvider } from "./stores/provider";
import { ConnectWallet } from "./components/connect-stark";
import { AppKitProvider } from "./stores/ethProvider";
import ConnectButton from "./components/connect-eth";

function App() {
  return (
    <AppKitProvider>
      <StarknetProvider>
        <div className="flex justify-center items-center h-full gap-16">
          <ConnectWallet />
          <ConnectButton />
        </div>
      </StarknetProvider>
    </AppKitProvider>
  );
}

export default App;
