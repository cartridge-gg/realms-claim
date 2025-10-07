import { hash } from 'starknet';
import { MerkleTree } from './merkleTree';

/**
 * Generate a Merkle proof for a specific leaf
 * Returns an array of sibling hashes needed to verify the leaf
 */
export function generateProof(
  tree: MerkleTree,
  leafIndex: number
): string[] {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error('Invalid leaf index');
  }

  const proof: string[] = [];
  let index = leafIndex;

  // Traverse up the tree, collecting sibling hashes
  for (let level = 0; level < tree.tree.length - 1; level++) {
    const currentLevel = tree.tree[level];
    const isRightNode = index % 2 === 1;

    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof
 * Returns true if the proof is valid for the given leaf and root
 */
export function verifyProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  let computedHash = leaf;

  for (const proofElement of proof) {
    // Hash in sorted order (matching Cairo implementation)
    computedHash = BigInt(computedHash) < BigInt(proofElement)
      ? hash.computePedersenHash(computedHash, proofElement)
      : hash.computePedersenHash(proofElement, computedHash);
  }

  return computedHash === root;
}

/**
 * Generate proofs for all leaves in the tree
 * Useful for generating a complete claim data file
 */
export function generateAllProofs(tree: MerkleTree): string[][] {
  return tree.leaves.map((_, index) => generateProof(tree, index));
}
