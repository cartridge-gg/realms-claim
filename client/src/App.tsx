import "./App.css";
import { ConnectWallet } from "./components/connect";
import { StarknetProvider } from "./stores/provider";

function App() {
  return (
    <StarknetProvider>
      <ConnectWallet />
    </StarknetProvider>
  );
}

export default App;
