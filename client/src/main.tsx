import { dojoConfig } from "./dojo/config.ts";
import { createRoot } from "react-dom/client";
import { init } from "@dojoengine/sdk";
import { DojoSdkProvider } from "@dojoengine/sdk/react";
import { StrictMode } from "react";
import { setupWorld } from "./dojo/typescript/contracts.gen.ts";
import App from "./App.tsx";

async function main() {
  const sdk = await init({
    client: {
      worldAddress: dojoConfig.manifest.world.address,
    },
    domain: {
      name: "Claims",
      version: "1.0",
      chainId: "KATANA",
      revision: "1",
    },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <DojoSdkProvider sdk={sdk} dojoConfig={dojoConfig} clientFn={setupWorld}>
        <App />
      </DojoSdkProvider>
    </StrictMode>
  );
}

main().catch(console.error);
