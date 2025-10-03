import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EligibilityRequest {
  walletAddress: string;
}

interface EligibilityResponse {
  walletAddress: string;
  isEligible: boolean;
  claimAmount: number;
  message: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { walletAddress } = req.body as EligibilityRequest;

  // Validate wallet address
  if (!walletAddress) {
    res.status(400).json({ error: 'Wallet address is required' });
    return;
  }

  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);

  if (!isValidAddress) {
    res.status(400).json({ error: 'Invalid wallet address format' });
    return;
  }

  // Generate arbitrary values based on wallet address
  // This is a mock implementation - replace with actual logic
  const hash = walletAddress.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const isEligible = hash % 2 === 0;
  const claimAmount = (hash % 1000) + 100;

  const response: EligibilityResponse = {
    walletAddress,
    isEligible,
    claimAmount,
    message: isEligible
      ? `Congratulations! You are eligible to claim ${claimAmount} tokens.`
      : 'Sorry, this wallet is not eligible for claims at this time.'
  };

  res.status(200).json(response);
}
