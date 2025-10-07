# Quick Start: Dual Wallet Connection

## Overview

The Realms Claim Portal now features a unified dashboard where you can connect both **Starknet** and **Ethereum** wallets simultaneously in a single view.

## UI Layout

```
┌─────────────────────────────────────────────┐
│          Realms Claim Portal                │
│  Connect your wallets to claim rewards      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ Starknet: Connected                       │
│ ○ Ethereum: Not Connected                   │
└─────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┐
│   STARKNET WALLET    │  ETHEREUM WALLET     │
│   (Orange Card)      │  (Blue Card)         │
│                      │                      │
│ [Connect Button]     │ [Connect Button]     │
└──────────────────────┴──────────────────────┘
```

## Setup Steps

### 1. Get WalletConnect Project ID (One-time)

```bash
# Visit https://cloud.walletconnect.com
# Create account → New project → Copy Project ID
```

Add to `client/.env`:
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 2. Install Dependencies

```bash
cd client
bun install
```

### 3. Start Dev Server

```bash
bun run dev
```

Visit: `http://localhost:5173`

## Using the Dashboard

### Connection Status Banner (Top)

- **Green Checkmark** ✓ = Wallet connected
- **Gray Circle** ○ = Wallet not connected

Shows real-time status for both Starknet and Ethereum.

### Starknet Wallet Card (Left/Orange)

**Before Connection:**
- Shows "Connect Starknet Wallet" button
- Explains Cartridge Controller integration

**After Connection:**
- Displays your Starknet address (truncated)
- Shows your @username
- "Disconnect" button

**To Connect:**
1. Click **"Connect Starknet Wallet"**
2. Cartridge Controller popup opens
3. Sign in or create account
4. Done! ✓

### Ethereum Wallet Card (Right/Blue)

**Before Connection:**
- Shows "Connect Ethereum Wallet" button
- Lists supported wallets

**After Connection:**
- Displays address or ENS name (e.g., yourname.eth)
- Shows current network (Mainnet, Sepolia, etc.)
- "Switch Wallet" and "Disconnect" buttons
- "Switch Network" link

**To Connect:**
1. Click **"Connect Ethereum Wallet"**
2. Modal opens with wallet options:
   - Browser: MetaMask, Coinbase, Rainbow, Rabby
   - Mobile: Scan QR code with Trust Wallet, etc.
3. Select your wallet
4. Approve connection
5. Done! ✓

## Features

### Both Wallets Can Be Connected Simultaneously

You can have:
- ✓ Both Starknet + Ethereum connected
- ✓ Only Starknet connected
- ✓ Only Ethereum connected
- ✓ Neither connected (guest mode)

### Ethereum Wallet Switching

**Switch Between Wallets:**
- Click "Switch Wallet" button
- Select different wallet from modal
- No need to disconnect first

**Switch Networks:**
- Click "Switch Network" link
- Choose: Mainnet, Sepolia, Arbitrum, Optimism, Polygon
- Approve in wallet

### Starknet Features

- **Username Display**: @yourname shows after connection
- **Session Management**: Managed by Cartridge Controller
- **Network**: Automatically uses configured network

## Supported Wallets

### Starknet
- ✅ Cartridge Controller (primary)
- ✅ ArgentX (via Starknet connectors)
- ✅ Braavos (via Starknet connectors)

### Ethereum
- ✅ **Browser Extensions:**
  - MetaMask
  - Coinbase Wallet
  - Rainbow
  - Rabby
  - Zerion
  - Frame

- ✅ **Mobile Wallets (via QR):**
  - Trust Wallet
  - Argent
  - imToken
  - 1inch Wallet
  - Ledger Live
  - 300+ more via WalletConnect

## Troubleshooting

### "Missing Project ID" Error
**Fix:** Add `VITE_WALLETCONNECT_PROJECT_ID` to `client/.env` and restart dev server.

### Starknet Won't Connect
**Fix:**
1. Check browser console for errors
2. Make sure Cartridge Controller is not blocked by popup blocker
3. Clear browser cache and retry

### Ethereum Won't Connect
**Fix:**
1. Make sure wallet extension is installed and unlocked
2. Check network connection
3. Try different wallet from modal
4. For mobile: Ensure WalletConnect app is installed

### ENS Name Not Showing
**Fix:** ENS only works on Ethereum Mainnet. Switch to Mainnet to see ENS names.

### Both Cards Not Showing
**Fix:**
1. Check both providers are wrapping App.tsx:
   ```tsx
   <EthereumProvider>
     <StarknetProvider>
       <WalletDashboard />
     </StarknetProvider>
   </EthereumProvider>
   ```
2. Ensure dependencies are installed: `bun install`

## Code Structure

```
client/src/
├── components/
│   └── WalletDashboard.tsx    # Main dual-wallet UI (NEW!)
├── stores/
│   ├── provider.tsx            # Starknet provider
│   └── ethereumProvider.tsx   # Ethereum provider
└── App.tsx                     # Wraps both providers
```

## Component Hierarchy

```
App.tsx
├── EthereumProvider
│   └── StarknetProvider
│       └── WalletDashboard
│           ├── Starknet Card (uses @starknet-react/core hooks)
│           └── Ethereum Card (uses wagmi hooks)
```

## API Reference

### Starknet Hooks

```typescript
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

const { address } = useAccount();              // Current Starknet address
const { connect, connectors } = useConnect();  // Connect function
const { disconnect } = useDisconnect();        // Disconnect function
```

### Ethereum Hooks

```typescript
import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

const { address, chain, isConnected } = useAccount();  // Current Ethereum account
const { disconnect } = useDisconnect();                 // Disconnect function
const { open } = useWeb3Modal();                        // Open wallet modal
```

## Next Steps

1. ✅ Connect both wallets
2. 🚀 Implement claim functionality
3. 🎨 Customize styling/branding
4. 📱 Test mobile wallet connections
5. 🔐 Add transaction signing

## Resources

- [WalletConnect Cloud](https://cloud.walletconnect.com)
- [Wagmi Documentation](https://wagmi.sh/)
- [Starknet React Docs](https://starknet-react.com/)
- [Full Setup Guide](./WALLET_SETUP.md)

---

**Need Help?**
- Check `WALLET_SETUP.md` for detailed documentation
- Open an issue on GitHub
- Contact support@realms-claim.xyz
