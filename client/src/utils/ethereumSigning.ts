import { verifyMessage } from 'viem';
import { num } from 'starknet';

/**
 * Create a message for the user to sign with their Ethereum wallet
 * MUST match the contract's expected format exactly (signature.cairo:25)
 *
 * Contract format: "Claim on starknet with: 0x{address_lowercase_no_leading_zeros}"
 */
export function createClaimMessage(starknetAddress: string): string {
  // Format address to match Cairo: lowercase, no leading zeros after 0x
  const formattedAddress = num.toHex(num.toBigInt(starknetAddress)).toLowerCase();

  return `Claim on starknet with: ${formattedAddress}`;
}

/**
 * Legacy function for ownership message (not used in contract)
 * Kept for reference
 */
export function createOwnershipMessage(
  ethereumAddress: string,
  starknetAddress: string,
  timestamp: number
): string {
  return `I am claiming tokens on Starknet with the following details:

Ethereum Address: ${ethereumAddress}
Starknet Address: ${starknetAddress}
Timestamp: ${timestamp}

By signing this message, I prove ownership of my Ethereum address and authorize the claim to be sent to my Starknet address.

This signature will not trigger any blockchain transaction or cost any gas fees.`;
}

/**
 * Verify an Ethereum signature
 */
export async function verifyEthereumSignature(
  message: string,
  signature: `0x${string}`,
  address: string
): Promise<boolean> {
  try {
    const recoveredAddress = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature
    });
    return recoveredAddress;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Parse Ethereum signature into (v, r, s) components
 * Signature is 65 bytes: r (32 bytes) + s (32 bytes) + v (1 byte)
 */
export function parseSignature(signature: string): {
  v: number;
  r: string;
  s: string;
} {
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;

  if (sig.length !== 130) {
    throw new Error(`Invalid signature length: ${sig.length}, expected 130 hex chars`);
  }

  const r = '0x' + sig.slice(0, 64);    // bytes 0-31
  const s = '0x' + sig.slice(64, 128);  // bytes 32-63
  const v = parseInt(sig.slice(128), 16); // byte 64

  return { v, r, s };
}

/**
 * Convert hex string to u256 Cairo format (low, high)
 */
export function hexToU256(hex: string): { low: string; high: string } {
  const value = BigInt(hex);
  const low = value & ((1n << 128n) - 1n);
  const high = value >> 128n;

  return {
    low: '0x' + low.toString(16),
    high: '0x' + high.toString(16)
  };
}

/**
 * Format claim data for display
 */
export function formatClaimData(claimData: string[]): {
  hex: string;
  decimal: string;
}[] {
  return claimData.map(data => ({
    hex: data,
    decimal: parseInt(data, 16).toLocaleString()
  }));
}
