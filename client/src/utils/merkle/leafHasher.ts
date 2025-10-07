import { hash } from 'starknet';

export interface LeafData {
  address: string;
  index: number;
  claim_data: string[];
}

/**
 * Hash leaf data using Poseidon + Pedersen
 * This must match the Cairo implementation in actions.cairo
 */
export function hashLeaf(leaf: LeafData): string {
  // Build array matching Cairo implementation:
  // [address, index, claim_data.length, ...claim_data]
  const elements = [
    leaf.address,
    leaf.index.toString(),
    leaf.claim_data.length.toString(),
    ...leaf.claim_data
  ];

  // Use Poseidon hash (matching Cairo implementation)
  const poseidonHash = hash.computePoseidonHashOnElements(elements);

  // Finalize with Pedersen (matching Cairo)
  return hash.computePedersenHash(poseidonHash, '0');
}

/**
 * Validate leaf data format
 */
export function validateLeafData(leaf: LeafData): boolean {
  if (!leaf.address || typeof leaf.index !== 'number' || !Array.isArray(leaf.claim_data)) {
    return false;
  }

  // Validate address format (Starknet address)
  if (!leaf.address.startsWith('0x') || leaf.address.length !== 66) {
    return false;
  }

  // Validate index is non-negative
  if (leaf.index < 0) {
    return false;
  }

  return true;
}
