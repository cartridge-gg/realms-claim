import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useCallback, useEffect, useState } from "react";
import ControllerConnector from "@cartridge/connector/controller";
import { Button } from "./ui/button";
import { StarterPackItemType, type StarterPack } from "@cartridge/controller";

export function ConnectWallet() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const controller = connectors[0] as ControllerConnector;
  const [username, setUsername] = useState<string>();
  const { connector } = useConnect();

  useEffect(() => {
    if (!address) return;
    controller.username()?.then((n) => setUsername(n));
  }, [address, controller]);

  const mintStarterPack = useCallback(async () => {
    const customPack: StarterPack = {
      name: "Beginner Pack",
      description: "Essential items for new players",
      acquisitionType: "CLAIMED",
      items: [
        {
          type: StarterPackItemType.FUNGIBLE,
          name: "LORDS",
          description: "In-game currency",
          amount: 100,
          call: [
            {
              contractAddress: "0x123...",
              entrypoint: "mint",
              calldata: ["user", "100", "0"],
            },
          ],
        },
        {
          type: StarterPackItemType.FUNGIBLE,
          name: "LS2 Games",
          description: "In-game currency",
          amount: 100,
          call: [
            {
              contractAddress: "0x123...",
              entrypoint: "mint",
              calldata: ["user", "100", "0"],
            },
          ],
        },
        {
          type: StarterPackItemType.FUNGIBLE,
          name: "Duelist Packs",
          description: "In-game currency",
          amount: 100,
          call: [
            {
              contractAddress: "0x123...",
              entrypoint: "mint",
              calldata: ["user", "100", "0"],
            },
          ],
        },
      ],
    };

    (connector as ControllerConnector).controller.openStarterPack(customPack);
  }, [address, connector]);

  return (
    <div>
      {address && (
        <>
          <p>Account: {address}</p>
          {username && <p>Username: {username}</p>}
          <button onClick={mintStarterPack}>claim</button>
        </>
      )}
      {address ? (
        <Button onClick={() => disconnect()}>Disconnect</Button>
      ) : (
        <Button onClick={() => connect({ connector: controller })}>
          Connect
        </Button>
      )}
    </div>
  );
}
