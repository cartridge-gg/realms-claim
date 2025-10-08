import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAccount as useStarknetAccount } from '@starknet-react/core';
import Controller from '@cartridge/controller';
import { createClaimMessage, parseSignature } from '../utils/ethereumSigning';
import { claimWithForwarder } from '../utils/contract/forwarder';
import { buildMerkleTreeKey } from '../utils/contract/types';
import type { SnapshotData } from '../types/snapshot';
import type { ProofsData } from '../types/proofs';

// Initialize Cartridge Controller (optional - can be used for advanced features)
const controller = new Controller();

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
  const [proofsData, setProofsData] = useState<ProofsData | null>(null);
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

  // Load snapshot and proofs data
  useEffect(() => {
    Promise.all([
      fetch('/src/data/snapshot.json').then(res => res.json()),
      fetch('/src/data/proofs.json').then(res => res.json())
    ])
      .then(([snapshotData, proofsJson]) => {
        setSnapshot(snapshotData);
        setProofsData(proofsJson);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
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

  // Generate leaf hash and prepare signing data (using pre-computed proofs)
  const handlePrepareSigningData = () => {
    console.log('🔴 BUTTON CLICKED - handlePrepareSigningData called!');

    if (!claimInfo || !snapshot || !proofsData) {
      console.error('Missing data', { claimInfo, snapshot, proofsData });
      alert('Missing claim info, snapshot, or proofs data');
      return;
    }

    console.log('⚡ Loading pre-computed proof (instant!)...', {
      address: claimInfo.address,
      index: claimInfo.index
    });

    try {
      // Lookup pre-computed proof by address
      const addressKey = claimInfo.address.toLowerCase();
      const proofData = proofsData.proofs[addressKey];

      if (!proofData) {
        throw new Error(`No proof found for address ${claimInfo.address}`);
      }

      console.log('✅ Proof loaded instantly!', {
        leafHash: proofData.leafHash,
        merkleRoot: proofsData.merkleRoot,
        proofLength: proofData.proof.length
      });

      // Update signing state with pre-computed data
      setSigningState(prev => ({
        ...prev,
        leafHash: proofData.leafHash,
        merkleRoot: proofsData.merkleRoot,
        merkleProof: proofData.proof
      }));

      console.log('✅ Signing state updated, showing demo...');
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

  // Simplified one-click claim using Cartridge Controller
  const handleSimplifiedClaim = async () => {
    if (!claimInfo || !snapshot || !proofsData || !ethAddress || !starknetAddress) {
      alert('Please connect both wallets and ensure you are eligible');
      return;
    }

    try {
      setTxState({ status: 'pending', hash: null, error: null });

      // Get pre-computed proof
      const addressKey = claimInfo.address.toLowerCase();
      const proofData = proofsData.proofs[addressKey];

      if (!proofData) {
        throw new Error(`No proof found for address ${claimInfo.address}`);
      }

      // Sign message with Ethereum wallet
      console.log('Requesting Ethereum signature...');
      const message = createClaimMessage(starknetAddress);
      const signature = await signMessageAsync({ message });
      const parsedSig = parseSignature(signature);

      // Build claim parameters
      const forwarderAddress = import.meta.env.VITE_FORWARDER_CONTRACT_ADDRESS;
      if (!forwarderAddress) {
        throw new Error('VITE_FORWARDER_CONTRACT_ADDRESS not set');
      }

      const merkleTreeKey = buildMerkleTreeKey(
        snapshot.claim_contract,
        snapshot.entrypoint,
        snapshot.contract_address
      );

      const leafData = {
        address: claimInfo.address,
        index: claimInfo.index,
        claim_contract_address: snapshot.claim_contract,
        entrypoint: snapshot.entrypoint,
        data: claimInfo.claimData
      };

      // Submit claim through controller
      console.log('Submitting claim transaction...');
      const result = await claimWithForwarder(
        account as any,
        forwarderAddress,
        merkleTreeKey,
        proofData.proof,
        leafData,
        starknetAddress,
        parsedSig
      );

      setTxState({
        status: 'success',
        hash: result.transaction_hash,
        error: null
      });

      console.log('✅ Claim successful!', result.transaction_hash);
    } catch (error: any) {
      console.error('Error claiming:', error);
      setTxState({
        status: 'error',
        hash: null,
        error: error.message || 'Failed to claim'
      });
    }
  };

  // Only show claim button if connected and eligible
  if (!isConnected || loading || !claimInfo) {
    return null; // Show nothing if not eligible
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="pointer-events-auto text-center">
        <button
          onClick={handleSimplifiedClaim}
          disabled={!starknetAddress || txState.status === 'pending' || txState.status === 'success'}
          className="px-16 py-8 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold text-3xl rounded-3xl hover:from-green-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-110 shadow-2xl backdrop-blur-md border-2 border-white/20"
        >
          {txState.status === 'pending' ? '⏳ Claiming...' : txState.status === 'success' ? '✅ Claimed!' : '🚀 Claim Now'}
        </button>

        {/* Success message */}
        {txState.status === 'success' && txState.hash && (
          <div className="mt-6">
            <a
              href={`https://starkscan.co/tx/${txState.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white/95 text-gray-900 font-bold text-lg rounded-2xl hover:bg-white transition-all shadow-2xl border-2 border-green-500"
            >
              View Transaction →
            </a>
          </div>
        )}

        {/* Error message */}
        {txState.status === 'error' && txState.error && (
          <div className="mt-6 px-8 py-4 bg-red-500/95 text-white rounded-2xl shadow-2xl max-w-md mx-auto border-2 border-red-700">
            <p className="font-semibold">{txState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
