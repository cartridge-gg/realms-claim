# Wallet Connection Setup Guide

This guide explains how to set up and use wallet connections for both Starknet and Ethereum in the Realms Claim application.

## Overview

The application supports dual wallet connectivity:
- **Starknet**: Using Cartridge Controller
- **Ethereum**: Using WalletConnect v2 with support for MetaMask, Coinbase Wallet, Trust Wallet, and more

## Prerequisites

1. **WalletConnect Project ID**
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Create a free account
   - Create a new project
   - Copy your Project ID

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your WalletConnect Project ID:
     ```bash
     VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
     ```

## Installation

Install the required dependencies:

```bash
# Using bun
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

## Supported Ethereum Wallets

The application supports multiple Ethereum wallets out of the box:

### Browser Extension Wallets
- **MetaMask** - Most popular Ethereum wallet
- **Coinbase Wallet** - Coinbase's browser extension
- **Rabby** - Multi-chain wallet
- **Rainbow** - Mobile-first wallet with browser extension
- **Zerion** - DeFi-focused wallet

### Mobile Wallets (via WalletConnect)
- **Trust Wallet**
- **Argent**
- **Ledger Live**
- **imToken**
- **1inch Wallet**
- And 300+ more wallets

## Supported Networks

### Ethereum Networks
- **Mainnet** (Chain ID: 1)
- **Sepolia** (Chain ID: 11155111) - Testnet
- **Arbitrum** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)
- **Polygon** (Chain ID: 137)

### Starknet Networks
- **Mainnet**
- **Sepolia** - Testnet

## Usage

### Starting the Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is taken).

### Connecting a Wallet

1. **Select Wallet Type**
   - Click either "Starknet" or "Ethereum" button at the top of the page

2. **For Starknet**
   - Click "Connect" button
   - Cartridge Controller will open
   - Sign in or create a new account

3. **For Ethereum**
   - Click "Connect Ethereum Wallet" button
   - A modal will appear showing all available wallet options
   - Select your preferred wallet
   - Approve the connection in your wallet

### Switching Networks

**Ethereum:**
- Click "Switch Network" button when connected
- Select your desired network from the modal
- Approve the network switch in your wallet

**Starknet:**
- Network selection is managed through Cartridge Controller

## Component Structure

```
client/src/
├── components/
│   ├── connect.tsx              # Starknet wallet connect
│   ├── EthereumConnect.tsx      # Ethereum wallet connect
│   └── WalletSelector.tsx       # Main wallet selector UI
├── stores/
│   ├── provider.tsx             # Starknet provider configuration
│   └── ethereumProvider.tsx    # Ethereum provider configuration
└── App.tsx                      # Main app with both providers
```

## Features

### Ethereum Wallet Features
- ✅ Connect to 300+ wallets via WalletConnect
- ✅ ENS name resolution (shows yourname.eth if available)
- ✅ Network switching
- ✅ Multiple chain support
- ✅ Automatic reconnection on page reload
- ✅ Mobile wallet support via QR code
- ✅ Secure connection management

### Starknet Wallet Features
- ✅ Cartridge Controller integration
- ✅ Username display
- ✅ Session management
- ✅ Multi-network support

## Security Best Practices

1. **Never commit your `.env` file** to version control
   - It's already in `.gitignore`
   - Contains sensitive configuration

2. **Keep your WalletConnect Project ID secure**
   - While not as sensitive as private keys, treat it carefully
   - Don't expose it in public repositories

3. **Wallet Connection Security**
   - Always verify the domain before connecting
   - Check the network before signing transactions
   - Review transaction details carefully

4. **Private Key Management**
   - Never share your private keys
   - Never enter private keys in the UI
   - Store recovery phrases securely offline

## Troubleshooting

### "Missing Project ID" Error
**Problem**: WalletConnect shows an error about missing project ID.
**Solution**:
1. Make sure you've added `VITE_WALLETCONNECT_PROJECT_ID` to your `.env` file
2. Restart the development server after adding environment variables

### Wallet Won't Connect
**Problem**: Wallet connection fails or hangs.
**Solutions**:
1. **Check Network Connection**: Ensure you have a stable internet connection
2. **Try Different Wallet**: Some wallets may have compatibility issues
3. **Clear Browser Cache**: Old cached data can cause connection issues
4. **Check Wallet Extension**: Ensure your wallet extension is up to date
5. **Mobile Wallet**: Make sure you're scanning the QR code with the correct wallet app

### Wrong Network
**Problem**: Connected to wrong Ethereum network.
**Solution**:
1. Click "Switch Network" button in the wallet card
2. Or switch networks directly in your wallet extension

### ENS Name Not Showing
**Problem**: Your ENS name doesn't appear.
**Solution**:
- ENS only works on Ethereum Mainnet
- Make sure you're connected to Mainnet
- ENS resolution may take a few seconds

### Transaction Fails
**Problem**: Claim transaction fails after signing.
**Solutions**:
1. **Check Gas**: Ensure you have enough ETH/tokens for gas
2. **Check Network**: Verify you're on the correct network
3. **Check Claim Eligibility**: Ensure you're eligible to claim
4. **Check Already Claimed**: You might have already claimed

## Advanced Configuration

### Adding Custom Networks

Edit `client/src/stores/ethereumProvider.tsx`:

```typescript
import { defineChain } from 'viem';

const customChain = defineChain({
  id: 12345,
  name: 'Custom Network',
  network: 'custom',
  nativeCurrency: {
    decimals: 18,
    name: 'Custom Token',
    symbol: 'CTK',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.custom-network.com'],
    },
    public: {
      http: ['https://rpc.custom-network.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.custom-network.com' },
  },
});

// Add to chains array
const chains = [mainnet, sepolia, customChain] as const;
```

### Customizing Wallet Modal

Edit `client/src/stores/ethereumProvider.tsx`:

```typescript
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true,
  enableOnramp: true,
  themeMode: 'light', // or 'dark'
  themeVariables: {
    '--w3m-accent': '#5865F2', // Custom accent color
    '--w3m-border-radius-master': '8px',
  },
});
```

## API Reference

### useAccount (wagmi)
```typescript
import { useAccount } from 'wagmi';

const { address, isConnected, chain } = useAccount();
```

### useConnect (Starknet)
```typescript
import { useConnect } from '@starknet-react/core';

const { connect, connectors } = useConnect();
```

### useWeb3Modal
```typescript
import { useWeb3Modal } from '@web3modal/wagmi/react';

const { open, close } = useWeb3Modal();

// Open wallet modal
open();

// Open specific view
open({ view: 'Networks' });
```

## Resources

- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Starknet React Documentation](https://starknet-react.com/)
- [Web3Modal Documentation](https://docs.walletconnect.com/web3modal/about)
- [Cartridge Documentation](https://docs.cartridge.gg/)

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review the [GitHub Issues](https://github.com/your-repo/issues)
3. Join our [Discord community](#)
4. Contact support at support@realms-claim.xyz

## License

This project is licensed under the MIT License - see the LICENSE file for details.
