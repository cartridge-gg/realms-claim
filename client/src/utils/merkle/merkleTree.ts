import { hash } from 'starknet';
import { hashLeaf, LeafData } from './leafHasher';

export interface MerkleTree {
  root: string;
  leaves: string[];
  tree: string[][];
}

/**
 * Build a Merkle tree from snapshot data
 * Uses Pedersen hash for combining nodes (matching Cairo implementation)
 */
export function buildMerkleTree(snapshot: LeafData[]): MerkleTree {
  if (snapshot.length === 0) {
    throw new Error('Snapshot cannot be empty');
  }

  // Hash all leaves
  const leaves = snapshot.map(leaf => hashLeaf(leaf));

  // Build tree bottom-up
  const tree: string[][] = [leaves];
  let currentLevel = leaves;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length
        ? currentLevel[i + 1]
        : left; // Duplicate if odd number

      // Hash in sorted order (matching Cairo verify_merkle_proof)
      const combined = BigInt(left) < BigInt(right)
        ? hash.computePedersenHash(left, right)
        : hash.computePedersenHash(right, left);

      nextLevel.push(combined);
    }

    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: currentLevel[0],
    leaves,
    tree
  };
}

/**
 * Get the leaf hash for a specific address
 */
export function getLeafHash(tree: MerkleTree, index: number): string {
  if (index < 0 || index >= tree.leaves.length) {
    throw new Error('Invalid leaf index');
  }
  return tree.leaves[index];
}

/**
 * Find the index of an address in the snapshot
 */
export function findAddressIndex(snapshot: LeafData[], address: string): number {
  return snapshot.findIndex(
    leaf => leaf.address.toLowerCase() === address.toLowerCase()
  );
}
