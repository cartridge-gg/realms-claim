import { CallData } from 'starknet';
import { hexToU256 } from '../ethereumSigning';
import type {
  MerkleTreeKey,
  LeafData,
  EthereumSignature
} from './types';
import {
  serializeLeafData
} from './types';

/**
 * Call verify_and_forward on the forwarder contract
 */
export async function claimWithForwarder(
  account: any, // AccountInterface from starknet-react
  forwarderAddress: string,
  merkleTreeKey: MerkleTreeKey,
  proof: string[],
  leafData: LeafData,
  recipient: string,
  ethSignature: EthereumSignature
): Promise<{ transaction_hash: string }> {
  // Serialize parameters
  const leafDataCalldata = serializeLeafData(leafData);

  // Convert r and s to u256 (low, high)
  const r = hexToU256(ethSignature.r);
  const s = hexToU256(ethSignature.s);

  // Build calldata for verify_and_forward
  const calldata = CallData.compile({
    merkle_tree_key: {
      chain_id: merkleTreeKey.chain_id,
      claim_contract_address: merkleTreeKey.claim_contract_address,
      entrypoint: merkleTreeKey.entrypoint,
      salt: merkleTreeKey.salt
    },
    proof: proof,
    leaf_data: leafDataCalldata,
    recipient: recipient,
    signature: {
      Ethereum: {
        v: ethSignature.v,
        r: { low: r.low, high: r.high },
        s: { low: s.low, high: s.high }
      }
    }
  });

  // Execute transaction
  const result = await account.execute({
    contractAddress: forwarderAddress,
    entrypoint: 'verify_and_forward',
    calldata
  });

  return result;
}

/**
 * Check if a leaf has been consumed (already claimed)
 */
export async function isLeafConsumed(
  account: any, // AccountInterface from starknet-react
  forwarderAddress: string,
  merkleTreeKey: MerkleTreeKey,
  leafHash: string
): Promise<boolean> {

  const calldata = CallData.compile({
    merkle_tree_key: {
      chain_id: merkleTreeKey.chain_id,
      claim_contract_address: merkleTreeKey.claim_contract_address,
      entrypoint: merkleTreeKey.entrypoint,
      salt: merkleTreeKey.salt
    },
    leaf_hash: leafHash
  });

  try {
    const result = await account.callContract({
      contractAddress: forwarderAddress,
      entrypoint: 'is_consumed',
      calldata
    });

    // Result is a boolean (0 or 1)
    return result[0] === '0x1' || result[0] === '1';
  } catch (error) {
    console.error('Error checking if leaf is consumed:', error);
    return false;
  }
}

/**
 * Get the Merkle root for a campaign
 */
export async function getMerkleRoot(
  account: any, // AccountInterface from starknet-react
  forwarderAddress: string,
  merkleTreeKey: MerkleTreeKey
): Promise<string> {
  const calldata = CallData.compile({
    merkle_tree_key: {
      chain_id: merkleTreeKey.chain_id,
      claim_contract_address: merkleTreeKey.claim_contract_address,
      entrypoint: merkleTreeKey.entrypoint,
      salt: merkleTreeKey.salt
    }
  });

  const result = await account.callContract({
    contractAddress: forwarderAddress,
    entrypoint: 'get_merkle_root',
    calldata
  });

  return result[0];
}
