/**
 * Transform Pirate Nation snapshot for Starknet claiming
 *
 * Input: Ethereum addresses with claim data from client/src/data/snapshot.json
 * Output: Format compatible with Cairo LeafData struct
 *
 * Usage: bun scripts/transformSnapshot.ts
 */

import fs from 'fs';
import path from 'path';

interface OriginalSnapshot {
  block_height: number;
  chain_id: string;
  claim_contract: string;
  contract_address: string;
  description: string;
  entrypoint: string;
  name: string;
  network: string;
  snapshot: [string, string[]][];
}

interface TransformedEntry {
  ethereumAddress: string;
  starknetAddress: string; // Placeholder - user provides during claim
  index: number;
  claim_data: string[];
}

async function main() {
  console.log('📋 Transforming Pirate Nation snapshot...\n');

  // Load original snapshot
  const inputPath = path.join(__dirname, '../src/data/snapshot.json');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Snapshot file not found at: ${inputPath}`);
  }

  const rawData: OriginalSnapshot = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  console.log('📊 Original Snapshot Info:');
  console.log(`   Name: ${rawData.name}`);
  console.log(`   Network: ${rawData.network}`);
  console.log(`   Description: ${rawData.description}`);
  console.log(`   Block Height: ${rawData.block_height}`);
  console.log(`   Total Addresses: ${rawData.snapshot.length}`);
  console.log('');

  // Transform to Starknet-compatible format
  const transformed: TransformedEntry[] = rawData.snapshot.map(
    ([ethAddress, claimData], index) => {
      return {
        ethereumAddress: ethAddress.toLowerCase(),
        // Placeholder - users will provide their Starknet address during claim
        // For testing, you can manually map specific addresses in address-mapping.json
        starknetAddress: '0x0',
        index,
        claim_data: claimData.map(hex => hex.toLowerCase())
      };
    }
  );

  // Ensure assets directory exists
  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Save transformed snapshot
  const outputPath = path.join(assetsDir, 'snapshot-transformed.json');
  fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));

  console.log('✅ Transformation Complete!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Total entries: ${transformed.length}`);
  console.log('');

  // Statistics
  const claimDataStats = transformed.reduce((acc, entry) => {
    const length = entry.claim_data.length;
    acc[length] = (acc[length] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  console.log('📊 Claim Data Statistics:');
  Object.entries(claimDataStats)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([length, count]) => {
      console.log(`   ${length} items: ${count} addresses`);
    });
  console.log('');

  // Show example entries
  console.log('📄 Example Entries:');
  console.log('');

  // Entry with minimum claim data
  const minEntry = transformed.reduce((min, entry) =>
    entry.claim_data.length < min.claim_data.length ? entry : min
  );
  console.log('Minimum claim data:');
  console.log(JSON.stringify(minEntry, null, 2));
  console.log('');

  // Entry with maximum claim data
  const maxEntry = transformed.reduce((max, entry) =>
    entry.claim_data.length > max.claim_data.length ? entry : max
  );
  console.log('Maximum claim data:');
  console.log(JSON.stringify(maxEntry, null, 2));
  console.log('');

  // First entry
  console.log('First entry:');
  console.log(JSON.stringify(transformed[0], null, 2));
  console.log('');

  console.log('⚠️  Important Notes:');
  console.log('   1. starknetAddress is "0x0" - users provide this during claim');
  console.log('   2. For testing, create address-mapping.json to map ETH → Starknet addresses');
  console.log('   3. Run bun run setup-campaign next to generate Merkle tree');
  console.log('');

  // Create example address mapping file
  const mappingPath = path.join(assetsDir, 'address-mapping.example.json');
  const exampleMapping = {
    [transformed[0].ethereumAddress]: '0x05f3c0645a554b1b867c4d5e7c14ac4537de8d2d8e98b7d3e8b0c3e7a0f4b8e9',
    [transformed[1].ethereumAddress]: '0x02c4d3c5e6f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
    '_comment': 'Add your Ethereum → Starknet address mappings here for testing'
  };
  fs.writeFileSync(mappingPath, JSON.stringify(exampleMapping, null, 2));
  console.log(`💡 Created example mapping file: ${mappingPath}`);
  console.log('   Copy to address-mapping.json and add your test addresses');
  console.log('');
}

main()
  .then(() => {
    console.log('🎉 Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  });
