export interface SnapshotEntry {
  address: string;
  index: number;
  data: string[];
}

export interface SnapshotData {
  name: string;
  network: string;
  description: string;
  claim_contract: string;
  contract_address: string;
  entrypoint: string;
  merkle_root?: string;
  chain_id: string;
  block_height: number;
  snapshot: [string, string[]][]; // Current format: [address, data]
  // TODO: Should be [string, number, string[]] with index
}

export interface TransformedSnapshotEntry {
  address: string;
  index: number;
  claim_contract: string;
  entrypoint: string;
  data: string[];
}
