import "./App.css";
import { StarknetProvider } from "./stores/provider";
import { useAccount, useConnect } from "@starknet-react/core";
import type ControllerConnector from "@cartridge/connector/controller";
import { useEffect } from "react";
import pirateSvg from "./assets/pirate.svg";
import crossSvg from "./assets/cross.svg";
import realmsSvg from "./assets/realms.svg";

function AppContent() {
  const { address } = useAccount();
  const { connectors, connector, connectAsync } = useConnect();

  const handleButtonClick = () => {
    if (address) {
      handleMintStarterPack();
    } else {
      connectAsync({ connector: connectors[0] });
    }
  };

  const handleMintStarterPack = () => {
    (connector as ControllerConnector).controller.openStarterPack(
      "pirate-nation-claim-mainnet"
    );
  };

  useEffect(() => {
    if (!address) return;

    setTimeout(() => {
      handleMintStarterPack();
    }, 300);
  }, [address]);

  return (
    <div className="h-full w-full bg-cover bg-center bg-no-repeat relative flex flex-col justify-between p-8">
      {/* Centered button */}
      <div className="flex flex-row gap-4 justify-center items-center">
        <img src={pirateSvg} alt="Pirate" className="w-12 h-12" />
        <img src={crossSvg} alt="Cross" className="w-4 h-4" />
        <img src={realmsSvg} alt="Realms" className="w-12 h-12" />
      </div>
      <div className=" fixed top-1/2 left-1/2 -translate-x-1/2">
        <button
          onClick={handleButtonClick}
          className="px-8 hover:cursor-pointer py-4 backdrop-blur-md border-[3px] border-[#FFFFFF50] rounded-xl text-white"
        >
          <div className="flex flex-row gap-2">
            <span className="font-fell uppercase tracking-[0.15rem]">
              Claim
            </span>
            <span className="font-fell-sc italic tracking-wider">your</span>
            <span className="font-fell uppercase tracking-[0.15rem]">
              free assets
            </span>
          </div>
        </button>
      </div>
      <div>
        {/* {address ? (
          <button className="bg-white" onClick={() => disconnect()}>
            disconnect
          </button>
        ) : null} */}
      </div>
    </div>
  );
}

function App() {
  return (
    <StarknetProvider>
      <AppContent />
    </StarknetProvider>
  );
}

export default App;
