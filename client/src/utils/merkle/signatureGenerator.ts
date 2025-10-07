import { ec, stark, num } from 'starknet';

export interface Signature {
  r: string;
  s: string;
}

/**
 * Sign a leaf hash with the app's private key
 * The signature proves that the app authorized this claim
 */
export function signLeafHash(
  leafHash: string,
  privateKey: string
): Signature {
  // Ensure inputs are in the correct format
  const messageHash = num.toBigInt(leafHash);
  const privKey = num.toBigInt(privateKey);

  // Sign the leaf hash with the app's private key
  const signature = ec.starkCurve.sign(messageHash, privKey);

  return {
    r: '0x' + signature.r.toString(16),
    s: '0x' + signature.s.toString(16)
  };
}

/**
 * Get the public key from a private key
 * This public key should be set in the contract via set_app_public_key
 */
export function getPublicKey(privateKey: string): string {
  const privKey = num.toBigInt(privateKey);
  const publicKey = ec.starkCurve.getStarkKey(privKey);
  return '0x' + publicKey;
}

/**
 * Verify a signature (client-side verification before sending to contract)
 */
export function verifySignature(
  leafHash: string,
  signature: Signature,
  publicKey: string
): boolean {
  try {
    const messageHash = num.toBigInt(leafHash);
    const pubKey = num.toBigInt(publicKey);
    const r = num.toBigInt(signature.r);
    const s = num.toBigInt(signature.s);

    return ec.starkCurve.verify({ r, s }, messageHash, pubKey);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate a random private key (for testing only!)
 * In production, use a secure key management system
 */
export function generatePrivateKey(): string {
  const randomPrivateKey = stark.randomAddress();
  return randomPrivateKey;
}
