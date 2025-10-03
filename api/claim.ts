import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ClaimRequest {
  walletAddress: string;
  amount?: number;
}

interface ClaimResponse {
  success: boolean;
  walletAddress: string;
  claimedAmount: number;
  transactionId: string;
  timestamp: string;
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

  const { walletAddress, amount } = req.body as ClaimRequest;

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

  // Generate arbitrary claim data
  const hash = walletAddress.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const claimedAmount = amount || (hash % 1000) + 100;

  // Generate a mock transaction ID
  const transactionId = `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;

  const response: ClaimResponse = {
    success: true,
    walletAddress,
    claimedAmount,
    transactionId,
    timestamp: new Date().toISOString(),
    message: `Successfully claimed ${claimedAmount} tokens for wallet ${walletAddress}`
  };

  res.status(200).json(response);
}
