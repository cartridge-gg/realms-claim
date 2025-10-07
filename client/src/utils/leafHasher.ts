import { hash, ec } from 'starknet';

/**
 * Hash leaf data to match Cairo implementation
 * Uses Poseidon hash followed by Pedersen hash
 */
export function hashLeaf(
  address: string,
  index: number,
  claimData: string[]
): string {
  // Prepare elements for hashing: [address, index, length, ...claim_data]
  const elements = [
    address,
    index.toString(),
    claimData.length.toString(),
    ...claimData
  ];

  // Use Poseidon hash (matching Cairo's poseidon_hash_span)
  const poseidonHash = hash.computePoseidonHashOnElements(elements);

  // Finalize with Pedersen(poseidon_hash, 0) - matching Cairo
  const finalHash = hash.computePedersenHash(poseidonHash, '0x0');

  return finalHash;
}

/**
 * Generate ECDSA signature for a leaf hash
 * This would typically be done by your backend with the app's private key
 */
export function signLeafHash(
  leafHash: string,
  privateKey: string
): { r: string; s: string } {
  const msgHash = BigInt(leafHash);
  const keyPair = ec.starkCurve.utils.randomPrivateKey();

  // In production, use your actual app private key
  const signature = ec.starkCurve.sign(msgHash, privateKey);

  return {
    r: '0x' + signature.r.toString(16),
    s: '0x' + signature.s.toString(16)
  };
}

/**
 * Verify ECDSA signature
 * Used to test signature generation
 */
export function verifySignature(
  leafHash: string,
  signature: { r: string; s: string },
  publicKey: string
): boolean {
  try {
    const msgHash = BigInt(leafHash);
    return ec.starkCurve.verify(
      {
        r: BigInt(signature.r),
        s: BigInt(signature.s)
      },
      msgHash,
      publicKey
    );
  } catch {
    return false;
  }
}
