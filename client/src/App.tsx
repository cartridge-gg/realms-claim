import "./App.css";
import { StarknetProvider } from "./stores/provider";
import { ConnectWallet } from "./components/connect-stark";
import { AppKitProvider } from "./stores/ethProvider";
import ConnectButton from "./components/connect-eth";
import { EligibilityChecker } from "./components/EligibilityChecker";

function App() {
  return (
    <AppKitProvider>
      <StarknetProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Realms Claim Portal
              </h1>
              <p className="text-gray-600">
                Check your eligibility for Pirate Nation claims
              </p>
            </div>

            {/* Wallet Connections */}
            <div className="flex justify-center items-center gap-8 flex-wrap">
              <div className="p-6 bg-white rounded-lg shadow border-2 border-orange-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 text-center">
                  Starknet Wallet
                </h3>
                <ConnectWallet />
              </div>
              <div className="p-6 bg-white rounded-lg shadow border-2 border-blue-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 text-center">
                  Ethereum Wallet
                </h3>
                <ConnectButton />
              </div>
            </div>

            {/* Eligibility Checker */}
            <EligibilityChecker />

            {/* Info Footer */}
            <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
              <p>
                Connect your Ethereum wallet to check if you're eligible for the claim
              </p>
            </div>
          </div>
        </div>
      </StarknetProvider>
    </AppKitProvider>
  );
}

export default App;
