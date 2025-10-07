import { useAccount as useStarknetAccount, useConnect, useDisconnect as useStarknetDisconnect } from "@starknet-react/core";
import { useAccount as useEthereumAccount, useDisconnect as useEthereumDisconnect, useEnsName } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useEffect, useState } from "react";
import ControllerConnector from "@cartridge/connector/controller";
import { Button } from "./ui/button";
import { Wallet, CheckCircle2, Circle } from 'lucide-react';

export function WalletDashboard() {
  // Starknet hooks
  const { connect, connectors } = useConnect();
  const { disconnect: disconnectStarknet } = useStarknetDisconnect();
  const { address: starknetAddress } = useStarknetAccount();
  const controller = connectors[0] as ControllerConnector;
  const [username, setUsername] = useState<string>();

  // Ethereum hooks
  const { open: openEthModal } = useWeb3Modal();
  const { address: ethereumAddress, isConnected: isEthereumConnected, chain } = useEthereumAccount();
  const { disconnect: disconnectEthereum } = useEthereumDisconnect();
  const { data: ensName } = useEnsName({ address: ethereumAddress });

  useEffect(() => {
    if (!starknetAddress) return;
    controller.username()?.then((n) => setUsername(n));
  }, [starknetAddress, controller]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Realms Claim Portal
          </h1>
          <p className="text-gray-600">
            Connect your wallets to claim rewards
          </p>
        </div>

        {/* Connection Status Banner */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              {starknetAddress ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">
                Starknet: {starknetAddress ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="hidden md:block w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              {isEthereumConnected ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">
                Ethereum: {isEthereumConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Starknet Wallet Card */}
          <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Wallet className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Starknet</h2>
                  <p className="text-sm text-orange-100">Cartridge Controller</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {starknetAddress ? (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Connected Address</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 break-all">
                      {formatAddress(starknetAddress)}
                    </p>
                    {username && (
                      <p className="text-sm text-orange-600 mt-2 font-medium">
                        @{username}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => disconnectStarknet()}
                      variant="destructive"
                      className="flex-1"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your Starknet wallet to interact with the protocol
                  </p>
                  <Button
                    onClick={() => connect({ connector: controller })}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="lg"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Starknet Wallet
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Ethereum Wallet Card */}
          <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ethereum</h2>
                  <p className="text-sm text-blue-100">MetaMask, WalletConnect & More</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isEthereumConnected && ethereumAddress ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Connected Address</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 break-all">
                      {ensName || formatAddress(ethereumAddress)}
                    </p>
                    {ensName && (
                      <p className="font-mono text-xs text-gray-500 mt-1">
                        {formatAddress(ethereumAddress)}
                      </p>
                    )}
                  </div>

                  {chain && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1 font-medium">Network</p>
                      <p className="text-sm font-semibold text-blue-700">{chain.name}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEthModal({ view: 'Account' })}
                      variant="outline"
                      className="flex-1"
                    >
                      Switch Wallet
                    </Button>
                    <Button
                      onClick={() => disconnectEthereum()}
                      variant="destructive"
                      className="flex-1"
                    >
                      Disconnect
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => openEthModal({ view: 'Networks' })}
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Switch Network
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your Ethereum wallet to access cross-chain features
                  </p>
                  <Button
                    onClick={() => openEthModal()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Ethereum Wallet
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Supports MetaMask, Coinbase, WalletConnect & 300+ wallets
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">About Wallet Connections</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Starknet Network</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Cartridge Controller integration</li>
                  <li>Mainnet & Sepolia testnet</li>
                  <li>Username-based accounts</li>
                  <li>Session key management</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Ethereum Network</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>MetaMask, Coinbase, Trust Wallet</li>
                  <li>300+ wallets via WalletConnect</li>
                  <li>Multiple networks (Mainnet, L2s)</li>
                  <li>ENS name resolution</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
            🔒 Your wallet connections are secure and local. We never store your private keys.
          </p>
        </div>
      </div>
    </div>
  );
}
