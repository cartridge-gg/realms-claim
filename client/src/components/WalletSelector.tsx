import { useState } from 'react';
import { ConnectWallet } from './connect';
import { EthereumConnect } from './EthereumConnect';
import { Button } from './ui/button';
import { Network } from 'lucide-react';

type WalletType = 'starknet' | 'ethereum';

export function WalletSelector() {
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('starknet');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Realms Claim Portal
          </h1>
          <p className="text-gray-600">
            Connect your wallet to claim rewards on Starknet or Ethereum
          </p>
        </div>

        {/* Wallet Type Selector */}
        <div className="flex gap-4 mb-6 justify-center">
          <Button
            onClick={() => setSelectedWallet('starknet')}
            variant={selectedWallet === 'starknet' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            Starknet
          </Button>
          <Button
            onClick={() => setSelectedWallet('ethereum')}
            variant={selectedWallet === 'ethereum' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            Ethereum
          </Button>
        </div>

        {/* Wallet Connection Component */}
        <div className="max-w-md mx-auto">
          {selectedWallet === 'starknet' ? (
            <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold">Starknet Wallet</h2>
              </div>
              <ConnectWallet />
            </div>
          ) : (
            <EthereumConnect />
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg shadow max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-3">About Wallet Connection</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Starknet:</strong> Connect with Cartridge Controller or other Starknet-compatible wallets.
            </p>
            <p>
              <strong>Ethereum:</strong> Connect with MetaMask, WalletConnect, Coinbase Wallet, and other Ethereum wallets.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Your wallet connection is secure and local. We never store your private keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
