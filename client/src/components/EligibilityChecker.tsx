import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAccount as useStarknetAccount } from '@starknet-react/core';
import { hashLeaf } from '../utils/leafHasher';
import { MerkleTree } from '../utils/merkleTree';
import { createClaimMessage, parseSignature } from '../utils/ethereumSigning';
import { claimWithForwarder } from '../utils/contract/forwarder';
import { buildMerkleTreeKey } from '../utils/contract/types';
import type { SnapshotData } from '../types/snapshot';

interface ClaimInfo {
  address: string;
  claimData: string[];
  index: number;
}

interface SigningState {
  leafHash: string | null;
  merkleRoot: string | null;
  merkleProof: string[] | null;
  ethereumSignature: { v: number; r: string; s: string } | null;
  claimMessage: string | null;
}

interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash: string | null;
  error: string | null;
}

export function EligibilityChecker() {
  const { address: ethAddress, isConnected } = useAccount();
  const { address: starknetAddress, account } = useStarknetAccount();
  const { signMessageAsync } = useSignMessage();

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [signingState, setSigningState] = useState<SigningState>({
    leafHash: null,
    merkleRoot: null,
    merkleProof: null,
    ethereumSignature: null,
    claimMessage: null
  });
  const [txState, setTxState] = useState<TransactionState>({
    status: 'idle',
    hash: null,
    error: null
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
    console.log('🔴 BUTTON CLICKED - handlePrepareSigningData called!');

    if (!claimInfo || !snapshot) {
      console.error('Missing claimInfo or snapshot', { claimInfo, snapshot });
      alert('Missing claim info or snapshot data');
      return;
    }

    console.log('Starting signing data preparation...', {
      address: claimInfo.address,
      index: claimInfo.index,
      claim_contract: snapshot.claim_contract,
      entrypoint: snapshot.entrypoint,
      claimData: claimInfo.claimData
    });

    try {
      // 1. Generate leaf hash (with claim_contract and entrypoint)
      console.log('Generating leaf hash...');
      const leafHash = hashLeaf(
        claimInfo.address,
        claimInfo.index,
        snapshot.claim_contract,
        snapshot.entrypoint,
        claimInfo.claimData
      );
      console.log('Leaf hash generated:', leafHash);

      // 2. Build Merkle tree from all leaves
      console.log('Building Merkle tree from', snapshot.snapshot.length, 'leaves...');
      console.log('⏳ About to hash all leaves...');
      const allLeaves = snapshot.snapshot.map(([addr, data], idx) =>
        hashLeaf(addr, idx, snapshot.claim_contract, snapshot.entrypoint, data)
      );
      console.log('✅ All leaves hashed, creating tree...');
      const merkleTree = new MerkleTree(allLeaves);
      console.log('✅ Tree created, getting root and proof...');
      const merkleRoot = merkleTree.root;
      const merkleProof = merkleTree.getProof(claimInfo.index);
      console.log('✅ Merkle tree built. Root:', merkleRoot, 'Proof length:', merkleProof.length);

      // 3. Verify proof locally
      console.log('Verifying proof locally...');
      const isValidProof = MerkleTree.verify(leafHash, merkleProof, merkleRoot);
      console.log('Proof verification result:', isValidProof);

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

      console.log('Signing state updated, showing demo...');
      setShowSigningDemo(true);
    } catch (error) {
      console.error('Error preparing signing data:', error);
      alert(`Error preparing signing data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Sign claim message with Ethereum wallet
  const handleSignWithEthereum = async () => {
    console.log('🔵 handleSignWithEthereum called', { ethAddress, starknetAddress });

    if (!ethAddress || !starknetAddress) {
      console.error('Missing wallet addresses:', { ethAddress, starknetAddress });
      alert('Please connect both Ethereum and Starknet wallets');
      return;
    }

    try {
      // Create the message that matches the contract format
      console.log('Creating claim message...');
      const message = createClaimMessage(starknetAddress);
      console.log('Message created:', message);

      // Sign with Ethereum wallet
      console.log('Requesting signature from Ethereum wallet...');
      console.log('signMessageAsync function:', signMessageAsync);

      if (!signMessageAsync) {
        throw new Error('signMessageAsync is not available. Is the Ethereum wallet connected?');
      }

      // Add a timeout wrapper to detect if the wallet isn't responding
      const signaturePromise = signMessageAsync({ message });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wallet signing timeout - check if MetaMask popup is open')), 60000)
      );

      console.log('⏳ Waiting for wallet signature... (check for MetaMask popup)');
      const signature = await Promise.race([signaturePromise, timeoutPromise]);
      console.log('Signature received:', signature);

      // Parse signature into (v, r, s)
      console.log('Parsing signature...');
      const parsed = parseSignature(signature);
      console.log('Signature parsed:', parsed);

      setSigningState(prev => ({
        ...prev,
        ethereumSignature: parsed,
        claimMessage: message
      }));
      console.log('✅ Signing state updated successfully');
    } catch (error) {
      console.error('Error signing message:', error);
      alert('Failed to sign message');
    }
  };

  // Submit claim transaction to Starknet
  const handleSubmitClaim = async () => {
    if (!signingState.ethereumSignature || !signingState.merkleProof || !claimInfo || !snapshot || !starknetAddress) {
      alert('Please complete all signing steps first');
      return;
    }

    // Check we have the required environment variables
    const forwarderAddress = import.meta.env.VITE_FORWARDER_CONTRACT_ADDRESS;
    if (!forwarderAddress) {
      alert('VITE_FORWARDER_CONTRACT_ADDRESS not set in environment variables');
      return;
    }

    try {
      setTxState({ status: 'pending', hash: null, error: null });

      // Check Starknet account is connected
      if (!account) {
        throw new Error('Starknet account not connected');
      }

      // Build MerkleTreeKey
      const merkleTreeKey = buildMerkleTreeKey(
        snapshot.claim_contract,
        snapshot.entrypoint,
        snapshot.contract_address // use contract_address as salt
      );

      // Build LeafData
      const leafData = {
        address: claimInfo.address,
        index: claimInfo.index,
        claim_contract_address: snapshot.claim_contract,
        entrypoint: snapshot.entrypoint,
        data: claimInfo.claimData
      };

      // Submit transaction
      const result = await claimWithForwarder(
        account as any, // Type assertion needed due to AccountInterface vs Account
        forwarderAddress,
        merkleTreeKey,
        signingState.merkleProof,
        leafData,
        starknetAddress,
        signingState.ethereumSignature
      );

      setTxState({
        status: 'success',
        hash: result.transaction_hash,
        error: null
      });
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      setTxState({
        status: 'error',
        hash: null,
        error: error.message || 'Failed to submit claim transaction'
      });
    }
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
                onClick={() => {
                  console.log('🟢 BUTTON ONCLICK FIRED!');
                  handlePrepareSigningData();
                }}
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

                {/* Step 3: Sign Claim Message with Ethereum */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-900">Step 3:</span>
                    <span className="text-sm text-gray-700">Sign Claim Message</span>
                    {signingState.ethereumSignature && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Sign a message with your Ethereum wallet to authorize the claim to your Starknet address.
                  </p>
                  <button
                    onClick={handleSignWithEthereum}
                    disabled={!starknetAddress || !signingState.leafHash}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {!starknetAddress ? 'Connect Starknet Wallet First' : 'Sign with Ethereum Wallet'}
                  </button>
                  {signingState.claimMessage && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Message Signed:</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {signingState.claimMessage}
                      </pre>
                    </div>
                  )}
                  {signingState.ethereumSignature && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Signature V:</p>
                        <p className="font-mono text-xs bg-gray-50 p-2 rounded">
                          {signingState.ethereumSignature.v}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Signature R:</p>
                        <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                          {signingState.ethereumSignature.r}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Signature S:</p>
                        <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                          {signingState.ethereumSignature.s}
                        </p>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Ethereum signature created! This authorizes the claim to your Starknet address.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 4: Submit Claim Transaction */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-green-900">Step 4:</span>
                    <span className="text-sm text-gray-700">Submit Claim Transaction</span>
                    {txState.status === 'success' && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Submit the claim transaction to the Starknet forwarder contract.
                  </p>
                  <button
                    onClick={handleSubmitClaim}
                    disabled={!signingState.ethereumSignature || !signingState.merkleProof || txState.status === 'pending' || txState.status === 'success'}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {txState.status === 'pending' ? 'Submitting...' : txState.status === 'success' ? 'Claimed!' : 'Claim on Starknet'}
                  </button>

                  {/* Transaction Status */}
                  {txState.status === 'pending' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        ⏳ Transaction pending... Please confirm in your Starknet wallet.
                      </p>
                    </div>
                  )}

                  {txState.status === 'success' && txState.hash && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        ✅ Claim successful!
                      </p>
                      <p className="text-xs text-gray-700 mb-1">Transaction Hash:</p>
                      <p className="font-mono text-xs bg-white p-2 rounded break-all mb-2">
                        {txState.hash}
                      </p>
                      <a
                        href={`https://starkscan.co/tx/${txState.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        View on Starkscan →
                      </a>
                    </div>
                  )}

                  {txState.status === 'error' && txState.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-semibold text-red-900 mb-1">
                        ❌ Transaction failed
                      </p>
                      <p className="text-xs text-red-700">
                        {txState.error}
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">📋 How It Works</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>The claim process verifies:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                      <li>Your Ethereum address is in the snapshot (Merkle proof)</li>
                      <li>You own the Ethereum address (Ethereum signature)</li>
                      <li>The claim goes to your specified Starknet address</li>
                      <li>You haven't claimed before (on-chain check)</li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-600">
                      <strong>Merkle Proof:</strong> {signingState.merkleProof?.length || 0} sibling hashes that prove your address is in the tree.
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Cross-chain:</strong> Ethereum signature authorizes the claim on Starknet.
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
