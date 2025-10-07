import { verifyMessage } from 'viem';

/**
 * Create a message for the user to sign with their Ethereum wallet
 * This proves ownership of the Ethereum address
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
