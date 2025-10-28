import { mainnet, type Chain } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from "@starknet-react/core";
import ControllerConnector from "@cartridge/connector/controller";

// Initialize the connector
const connector = new ControllerConnector({
  preset: "eternum",
  slot: "claim-main",
});
// Configure RPC provider
const provider = jsonRpcProvider({
  rpc: () => {
    return { nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet" };
  },
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      autoConnect
      defaultChainId={mainnet.id}
      chains={[mainnet]}
      provider={provider}
      connectors={[connector]}
      explorer={cartridge}
    >
      {children}
    </StarknetConfig>
  );
}
