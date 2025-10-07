import { hash } from 'starknet';

/**
 * Simple Merkle Tree implementation for proof generation
 * Uses Pedersen hash with sorted order (matching Cairo implementation)
 */
export class MerkleTree {
  public leaves: string[];
  public layers: string[][];

  constructor(leaves: string[]) {
    if (leaves.length === 0) {
      throw new Error('Cannot create Merkle tree with no leaves');
    }

    this.leaves = leaves;
    this.layers = [leaves];

    // Build tree bottom-up
    let currentLayer = leaves;
    while (currentLayer.length > 1) {
      currentLayer = this.getNextLayer(currentLayer);
      this.layers.push(currentLayer);
    }
  }

  /**
   * Get the root of the Merkle tree
   */
  get root(): string {
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Generate proof for a leaf at given index
   */
  getProof(index: number): string[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Leaf index out of bounds');
    }

    const proof: string[] = [];
    let currentIndex = index;

    // Go up the tree, collecting sibling hashes
    for (let i = 0; i < this.layers.length - 1; i++) {
      const currentLayer = this.layers[i];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLayer.length) {
        proof.push(currentLayer[siblingIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a proof for a given leaf and root
   */
  static verify(leaf: string, proof: string[], root: string): boolean {
    let computedHash = leaf;

    for (const proofElement of proof) {
      // Hash in sorted order (matching Cairo implementation)
      const a = BigInt(computedHash);
      const b = BigInt(proofElement);

      computedHash = a < b
        ? hash.computePedersenHash(computedHash, proofElement)
        : hash.computePedersenHash(proofElement, computedHash);
    }

    return computedHash === root;
  }

  /**
   * Build next layer of the tree
   */
  private getNextLayer(layer: string[]): string[] {
    const nextLayer: string[] = [];

    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        // Pair exists - hash in sorted order
        const a = BigInt(layer[i]);
        const b = BigInt(layer[i + 1]);

        const pairHash = a < b
          ? hash.computePedersenHash(layer[i], layer[i + 1])
          : hash.computePedersenHash(layer[i + 1], layer[i]);

        nextLayer.push(pairHash);
      } else {
        // Odd node - promote to next layer
        nextLayer.push(layer[i]);
      }
    }

    return nextLayer;
  }
}
