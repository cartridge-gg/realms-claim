import { useState, useEffect } from 'react';
import { useAccount, useContractWrite } from '@starknet-react/core';
import { Contract } from 'starknet';

interface ClaimData {
  address: string;
  index: number;
  claim_data: string[];
  leafHash: string;
  proof: string[];
  signature: {
    r: string;
    s: string;
  };
}

interface ClaimDataFile {
  campaignId: string;
  merkleRoot: string;
  publicKey: string;
  timestamp: string;
  totalClaims: number;
  claims: ClaimData[];
}

// Import your contract ABI here
// import { actionsAbi } from '../abis/actions';

export function ClaimButton() {
  const { address, isConnected } = useAccount();
  const [claimData, setClaimData] = useState<ClaimDataFile | null>(null);
  const [userClaim, setUserClaim] = useState<ClaimData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load claim data on mount
  useEffect(() => {
    fetch('/assets/claimData.json')
      .then(res => res.json())
      .then(data => setClaimData(data))
      .catch(err => console.error('Failed to load claim data:', err));
  }, []);

  // Find user's claim when address changes
  useEffect(() => {
    if (address && claimData) {
      const claim = claimData.claims.find(
        c => c.address.toLowerCase() === address.toLowerCase()
      );
      setUserClaim(claim || null);
    }
  }, [address, claimData]);

  const handleClaim = async () => {
    if (!userClaim || !address || !claimData) {
      setError('Missing claim data');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      // Get contract instance
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      // You'll need to import your contract ABI
      // const contract = new Contract(actionsAbi, contractAddress, provider);

      // Prepare leaf data for contract call
      const leafData = {
        address: userClaim.address,
        index: userClaim.index,
        claim_data: userClaim.claim_data
      };

      // Call the claim function
      // const tx = await contract.claim(
      //   claimData.campaignId,
      //   leafData,
      //   userClaim.proof,
      //   userClaim.signature.r,
      //   userClaim.signature.s
      // );

      // Wait for transaction to be confirmed
      // await provider.waitForTransaction(tx.transaction_hash);

      console.log('Claim parameters:', {
        campaignId: claimData.campaignId,
        leafData,
        proof: userClaim.proof,
        signature: userClaim.signature
      });

      setClaimed(true);
      alert('✅ Claim successful!');
    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800">Please connect your wallet to check eligibility</p>
      </div>
    );
  }

  if (!claimData) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded">
        <p className="text-gray-800">Loading claim data...</p>
      </div>
    );
  }

  if (!userClaim) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-800">Address not eligible for claim</p>
        <p className="text-sm text-gray-600 mt-2">
          Connected: {address?.substring(0, 10)}...{address?.substring(address.length - 8)}
        </p>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="p-4 bg-green-100 border border-green-400 rounded">
        <p className="text-green-800 font-semibold">✅ Claim Successful!</p>
        <p className="text-sm text-gray-600 mt-2">
          Your claim has been processed. Check your wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Claim Your Rewards</h2>

      <div className="mb-4 space-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Address:</span>{' '}
          {userClaim.address.substring(0, 10)}...{userClaim.address.substring(userClaim.address.length - 8)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Claim Data:</span> [{userClaim.claim_data.join(', ')}]
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Proof Length:</span> {userClaim.proof.length} hashes
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={claiming}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
          claiming
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {claiming ? 'Claiming...' : 'Claim Now'}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Campaign: {claimData.campaignId}
      </p>
    </div>
  );
}
