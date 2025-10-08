/**
 * Type definitions for pre-generated Merkle proofs
 */

export interface ProofData {
  index: number;
  proof: string[];
  leafHash: string;
  claimData: string[];
}

export interface ProofsData {
  merkleRoot: string;
  treeSize: number;
  generatedAt: string;
  snapshot: {
    name: string;
    network: string;
    blockHeight: number;
    claimContract: string;
    entrypoint: string;
  };
  proofs: Record<string, ProofData>;
}
