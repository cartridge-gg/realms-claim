import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAccount as useStarknetAccount } from '@starknet-react/core';
import { hashLeaf } from '../utils/leafHasher';
import { MerkleTree } from '../utils/merkleTree';
import { createOwnershipMessage } from '../utils/ethereumSigning';

interface SnapshotData {
  name: string;
  network: string;
  description: string;
  snapshot: [string, string[]][];
}

interface ClaimInfo {
  address: string;
  claimData: string[];
  index: number;
}

interface SigningState {
  leafHash: string | null;
  merkleRoot: string | null;
  merkleProof: string[] | null;
  ethereumSignature: string | null;
  ownershipMessage: string | null;
  appSignature: { r: string; s: string } | null;
}

export function EligibilityChecker() {
  const { address: ethAddress, isConnected } = useAccount();
  const { address: starknetAddress } = useStarknetAccount();
  const { signMessageAsync } = useSignMessage();

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [signingState, setSigningState] = useState<SigningState>({
    leafHash: null,
    merkleRoot: null,
    merkleProof: null,
    ethereumSignature: null,
    ownershipMessage: null,
    appSignature: null
  });
  const [showSigningDemo, setShowSigningDemo] = useState(false);

  // Load snapshot data
  useEffect(() => {
    fetch('/src/data/snapshot.json')
      .then(res => res.json())
      .then(data => {
        setSnapshot(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load snapshot:', err);
        setLoading(false);
      });
  }, []);

  // Check eligibility when address changes
  useEffect(() => {
    if (!ethAddress || !snapshot) {
      setClaimInfo(null);
      return;
    }

    const normalizedAddress = ethAddress.toLowerCase();
    const entryIndex = snapshot.snapshot.findIndex(
      ([addr]) => addr.toLowerCase() === normalizedAddress
    );

    if (entryIndex !== -1) {
      const [addr, claimData] = snapshot.snapshot[entryIndex];
      setClaimInfo({
        address: addr,
        claimData,
        index: entryIndex
      });
    } else {
      setClaimInfo(null);
    }
  }, [ethAddress, snapshot]);

  // Generate leaf hash and prepare signing data
  const handlePrepareSigningData = () => {
    if (!claimInfo || !snapshot) return;

    try {
      // 1. Generate leaf hash
      const leafHash = hashLeaf(
        claimInfo.address,
        claimInfo.index,
        claimInfo.claimData
      );

      // 2. Build Merkle tree from all leaves
      const allLeaves = snapshot.snapshot.map(([addr, data], idx) =>
        hashLeaf(addr, idx, data)
      );
      const merkleTree = new MerkleTree(allLeaves);
      const merkleRoot = merkleTree.root;
      const merkleProof = merkleTree.getProof(claimInfo.index);

      // 3. Verify proof locally
      const isValidProof = MerkleTree.verify(leafHash, merkleProof, merkleRoot);
      if (!isValidProof) {
        alert('Merkle proof verification failed!');
        return;
      }

      setSigningState(prev => ({
        ...prev,
        leafHash,
        merkleRoot,
        merkleProof
      }));

      setShowSigningDemo(true);
    } catch (error) {
      console.error('Error preparing signing data:', error);
      alert('Error preparing signing data');
    }
  };

  // Sign with Ethereum wallet
  const handleSignWithEthereum = async () => {
    if (!ethAddress || !starknetAddress) {
      alert('Please connect both Ethereum and Starknet wallets');
      return;
    }

    try {
      const timestamp = Date.now();
      const message = createOwnershipMessage(
        ethAddress,
        starknetAddress,
        timestamp
      );

      const signature = await signMessageAsync({ message });

      setSigningState(prev => ({
        ...prev,
        ethereumSignature: signature,
        ownershipMessage: message
      }));
    } catch (error) {
      console.error('Error signing message:', error);
      alert('Failed to sign message');
    }
  };

  // Simulate backend app signature
  const handleSimulateAppSignature = () => {
    if (!signingState.leafHash) {
      alert('Please generate leaf hash first');
      return;
    }

    // In production, your backend would:
    // 1. Receive the leaf hash
    // 2. Verify eligibility
    // 3. Sign with app's private key
    // 4. Return signature

    setSigningState(prev => ({
      ...prev,
      appSignature: {
        r: '0x1234...', // Backend would provide real signature
        s: '0x5678...'  // Backend would provide real signature
      }
    }));

    alert('In production, your backend would sign the leaf hash with the app private key and return the signature (r, s)');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-600">
          Loading snapshot data...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="text-center">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            Check Your Eligibility
          </h3>
          <p className="text-blue-700">
            Connect your Ethereum wallet above to check if you're eligible for the {snapshot?.name || 'claim'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Snapshot Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold mb-2">Snapshot Information</h3>
        <div className="space-y-1 text-sm text-gray-700">
          <p><strong>Campaign:</strong> {snapshot?.name}</p>
          <p><strong>Network:</strong> {snapshot?.network}</p>
          <p><strong>Total Addresses:</strong> {snapshot?.snapshot.length.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">{snapshot?.description}</p>
        </div>
      </div>

      {/* Eligibility Status */}
      {claimInfo ? (
        <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-green-900 mb-1">
                ✅ You're Eligible!
              </h3>
              <p className="text-green-700">
                Your address was found in the snapshot
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Address Info */}
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Your Address</p>
              <p className="font-mono text-sm break-all text-gray-900">
                {claimInfo.address}
              </p>
            </div>

            {/* Position in Snapshot */}
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Position in Snapshot</p>
              <p className="text-lg font-bold text-gray-900">
                #{claimInfo.index + 1} of {snapshot?.snapshot.length.toLocaleString()}
              </p>
            </div>

            {/* Claim Data */}
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Claim Data</p>
              <div className="space-y-2">
                {claimInfo.claimData.map((data, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-xs font-semibold text-gray-500">
                      Item {idx + 1}:
                    </span>
                    <span className="font-mono text-sm text-gray-900">
                      {data}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      (Dec: {parseInt(data, 16)})
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Total items: {claimInfo.claimData.length}
              </p>
            </div>

            {/* Next Steps */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                🎉 Next Steps
              </p>
              <p className="text-sm text-blue-800 mb-4">
                You are eligible to claim! Click below to see how the signing process works.
              </p>
              <button
                onClick={handlePrepareSigningData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Show Signing Demo
              </button>
            </div>

            {/* Signing Demo Section */}
            {showSigningDemo && (
              <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <h3 className="text-xl font-bold text-purple-900 mb-4">
                  🔐 Signing Process Demonstration
                </h3>

                {/* Step 1: Leaf Hash */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-900">Step 1:</span>
                    <span className="text-sm text-gray-700">Generate Leaf Hash</span>
                    {signingState.leafHash && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  {signingState.leafHash ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Leaf Hash:</p>
                      <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                        {signingState.leafHash}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        This hash uniquely identifies your claim and is computed from: address + index + claim_data
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">Leaf hash generated automatically</p>
                  )}
                </div>

                {/* Step 2: Merkle Proof */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-900">Step 2:</span>
                    <span className="text-sm text-gray-700">Merkle Proof Generation</span>
                    {signingState.merkleProof && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  {signingState.merkleProof && signingState.merkleRoot ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Merkle Root:</p>
                        <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                          {signingState.merkleRoot}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Proof (sibling hashes):
                        </p>
                        <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                          {signingState.merkleProof.map((hash, idx) => (
                            <p key={idx} className="font-mono text-xs break-all">
                              {idx + 1}. {hash}
                            </p>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        The contract will use this proof to verify your leaf is in the tree (root: {signingState.merkleRoot.slice(0, 10)}...)
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">Merkle proof generated automatically</p>
                  )}
                </div>

                {/* Step 3: Backend App Signature */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-900">Step 3:</span>
                    <span className="text-sm text-gray-700">Backend App Signature</span>
                    {signingState.appSignature && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Your backend signs the leaf hash with the app's private key to authorize the claim.
                  </p>
                  <button
                    onClick={handleSimulateAppSignature}
                    disabled={!signingState.leafHash}
                    className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Simulate Backend Signature
                  </button>
                  {signingState.appSignature && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Signature R:</p>
                        <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                          {signingState.appSignature.r}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Signature S:</p>
                        <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                          {signingState.appSignature.s}
                        </p>
                      </div>
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ This is a demo. In production, your backend API would provide the real signature.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 4: Ethereum Ownership Proof */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-900">Step 4:</span>
                    <span className="text-sm text-gray-700">Ethereum Ownership Proof</span>
                    {signingState.ethereumSignature && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Sign a message with your Ethereum wallet to prove you own the address in the snapshot.
                  </p>
                  <button
                    onClick={handleSignWithEthereum}
                    disabled={!starknetAddress}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {starknetAddress ? 'Sign with Ethereum Wallet' : 'Connect Starknet Wallet First'}
                  </button>
                  {signingState.ownershipMessage && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Message Signed:</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {signingState.ownershipMessage}
                      </pre>
                    </div>
                  )}
                  {signingState.ethereumSignature && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Signature:</p>
                      <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                        {signingState.ethereumSignature}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Signature created! This proves you control the Ethereum address.
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                  <h4 className="font-bold text-green-900 mb-2">📋 Summary</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>To claim on Starknet, you need:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Campaign ID (from snapshot)</li>
                      <li>Leaf Data (address, index, claim_data)</li>
                      <li>Merkle Proof ({signingState.merkleProof?.length || 0} hashes)</li>
                      <li>App Signature (r, s) from backend</li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-600">
                      The contract verifies: caller matches address, proof is valid, signature is valid, and leaf hasn't been claimed before.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-red-900 mb-1">
                Not Eligible
              </h3>
              <p className="text-red-700 mb-4">
                Your address was not found in the snapshot
              </p>
            </div>
          </div>

          {/* Connected Address */}
          <div className="p-4 bg-white rounded-lg border border-red-200 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Connected Address</p>
            <p className="font-mono text-sm break-all text-gray-900">
              {ethAddress}
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Only addresses that were part of the {snapshot?.name} snapshot at block {snapshot ? 'height' : ''} are eligible for this claim.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
