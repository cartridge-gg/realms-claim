import { hash, ec, selector } from 'starknet';

/**
 * Hash leaf data to match Cairo implementation
 * Uses Poseidon hash followed by Pedersen hash
 *
 * MUST match Cairo LeafData<T> serialization:
 * [address, index, claim_contract_address, entrypoint, data.length, ...data]
 */
export function hashLeaf(
  address: string,
  index: number,
  claimContract: string,
  entrypoint: string,
  claimData: string[]
): string {
  // Convert entrypoint to selector (felt252)
  const entrypointSelector = selector.getSelectorFromName(entrypoint);

  // Prepare elements for hashing to match Cairo LeafData<EthAddress> serialization
  const elements = [
    address,                          // address (EthAddress)
    index.toString(),                 // index (u32)
    claimContract,                    // claim_contract_address (ContractAddress)
    entrypointSelector,               // entrypoint (felt252)
    claimData.length.toString(),      // data.length (u32)
    ...claimData                      // data elements (Array<felt252>)
  ];

  // Use Poseidon hash (matching Cairo's poseidon_hash_span)
  const poseidonHash = hash.computePoseidonHashOnElements(elements);

  // Finalize with Pedersen hash (matching Cairo's LeafDataHashImpl)
  // Cairo: pedersen(0, hash_state.update_with(hashed).update_with(1).finalize())
  const hashState = hash.computePedersenHash(poseidonHash, '0x1');
  const finalHash = hash.computePedersenHash('0x0', hashState);

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
