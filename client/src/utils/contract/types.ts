import { selector } from 'starknet';

export interface MerkleTreeKey {
  chain_id: string;
  claim_contract_address: string;
  entrypoint: string;
  salt: string;
}

export interface LeafData {
  address: string;
  index: number;
  claim_contract_address: string;
  entrypoint: string;
  data: string[];
}

export interface EthereumSignature {
  v: number;
  r: string;
  s: string;
}

/**
 * Build MerkleTreeKey for Ethereum chain claims
 */
export function buildMerkleTreeKey(
  claimContract: string,
  entrypoint: string,
  salt: string = '0x0'
): MerkleTreeKey {
  return {
    chain_id: 'ETHEREUM',
    claim_contract_address: claimContract,
    entrypoint: selector.getSelectorFromName(entrypoint),
    salt
  };
}

/**
 * Serialize LeafData to felt252 array for contract call
 * Must match Cairo LeafData<EthAddress> structure
 */
export function serializeLeafData(leafData: LeafData): string[] {
  const entrypointSelector = selector.getSelectorFromName(leafData.entrypoint);

  return [
    leafData.address,                      // address (EthAddress)
    leafData.index.toString(),             // index (u32)
    leafData.claim_contract_address,       // claim_contract_address (ContractAddress)
    entrypointSelector,                    // entrypoint (felt252)
    leafData.data.length.toString(),       // data.length (u32)
    ...leafData.data                       // data elements (Array<felt252>)
  ];
}

/**
 * Serialize MerkleTreeKey to felt252 array for contract call
 */
export function serializeMerkleTreeKey(key: MerkleTreeKey): string[] {
  return [
    key.chain_id,
    key.claim_contract_address,
    key.entrypoint,
    key.salt
  ];
}
