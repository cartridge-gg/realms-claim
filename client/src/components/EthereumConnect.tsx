import { useAccount, useDisconnect, useEnsName } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Button } from './ui/button';
import { Wallet } from 'lucide-react';

export function EthereumConnect() {
  const { open } = useWeb3Modal();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold">Ethereum Wallet</h2>
      </div>

      {isConnected && address ? (
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Connected Address</p>
            <p className="font-mono text-sm font-semibold">
              {ensName || formatAddress(address)}
            </p>
            {ensName && (
              <p className="font-mono text-xs text-gray-500 mt-1">
                {formatAddress(address)}
              </p>
            )}
          </div>

          {chain && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Network</p>
              <p className="text-sm font-semibold text-blue-700">{chain.name}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => open()}
              variant="outline"
              className="flex-1"
            >
              Change Wallet
            </Button>
            <Button
              onClick={() => disconnect()}
              variant="destructive"
              className="flex-1"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your Ethereum wallet to claim rewards
          </p>
          <Button
            onClick={() => open()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Ethereum Wallet
          </Button>
        </div>
      )}

      {isConnected && (
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => open({ view: 'Networks' })}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Switch Network
          </button>
        </div>
      )}
    </div>
  );
}
