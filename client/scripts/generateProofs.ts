/**
 * Pre-generate Merkle proofs for all addresses in snapshot
 *
 * This script:
 * 1. Loads the snapshot data
 * 2. Builds the Merkle tree once
 * 3. Generates proof for each address
 * 4. Saves to proofs.json for fast lookup
 *
 * Usage: bun scripts/generateProofs.ts
 */

import fs from 'fs';
import path from 'path';
import { hashLeaf } from '../src/utils/leafHasher';
import { MerkleTree } from '../src/utils/merkleTree';

interface SnapshotData {
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

interface ProofData {
  index: number;
  proof: string[];
  leafHash: string;
  claimData: string[];
}

interface ProofsOutput {
  merkleRoot: string;
  treeSize: number;
  generatedAt: string;
  snapshot: {
    name: string;
    network: string;
    blockHeight: number;
    claimContract: string;
    entrypoint: string;
  };
  proofs: Record<string, ProofData>;
}

async function main() {
  console.log('🌳 Generating Merkle Proofs...\n');

  // Load snapshot
  const snapshotPath = path.join(__dirname, '../src/data/snapshot.json');

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found at: ${snapshotPath}`);
  }

  const snapshot: SnapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

  console.log('📊 Snapshot Info:');
  console.log(`   Name: ${snapshot.name}`);
  console.log(`   Network: ${snapshot.network}`);
  console.log(`   Total Addresses: ${snapshot.snapshot.length}`);
  console.log(`   Claim Contract: ${snapshot.claim_contract}`);
  console.log(`   Entrypoint: ${snapshot.entrypoint}`);
  console.log('');

  // Build Merkle tree from all leaves
  console.log('🔨 Building Merkle tree...');
  const startTime = Date.now();

  const allLeaves = snapshot.snapshot.map(([addr, data], idx) =>
    hashLeaf(addr, idx, snapshot.claim_contract, snapshot.entrypoint, data)
  );

  const merkleTree = new MerkleTree(allLeaves);
  const merkleRoot = merkleTree.root;

  const buildTime = Date.now() - startTime;
  console.log(`✅ Tree built in ${buildTime}ms`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  console.log('');

  // Generate proof for each address
  console.log('🔐 Generating proofs for all addresses...');
  const proofsStartTime = Date.now();

  const proofs: Record<string, ProofData> = {};

  for (let i = 0; i < snapshot.snapshot.length; i++) {
    const [address, claimData] = snapshot.snapshot[i];

    const leafHash = hashLeaf(
      address,
      i,
      snapshot.claim_contract,
      snapshot.entrypoint,
      claimData
    );

    const proof = merkleTree.getProof(i);

    // Verify proof (sanity check)
    const isValid = MerkleTree.verify(leafHash, proof, merkleRoot);
    if (!isValid) {
      throw new Error(`Invalid proof generated for address ${address} at index ${i}`);
    }

    // Store proof indexed by lowercase address
    proofs[address.toLowerCase()] = {
      index: i,
      proof,
      leafHash,
      claimData
    };

    // Progress indicator
    if ((i + 1) % 100 === 0 || i === snapshot.snapshot.length - 1) {
      process.stdout.write(`\r   Progress: ${i + 1}/${snapshot.snapshot.length}`);
    }
  }

  const proofsTime = Date.now() - proofsStartTime;
  console.log(`\n✅ All proofs generated in ${proofsTime}ms`);
  console.log('');

  // Create output object
  const output: ProofsOutput = {
    merkleRoot,
    treeSize: snapshot.snapshot.length,
    generatedAt: new Date().toISOString(),
    snapshot: {
      name: snapshot.name,
      network: snapshot.network,
      blockHeight: snapshot.block_height,
      claimContract: snapshot.claim_contract,
      entrypoint: snapshot.entrypoint
    },
    proofs
  };

  // Save to file
  const outputPath = path.join(__dirname, '../src/data/proofs.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log('💾 Proofs saved!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   File Size: ${fileSize} MB`);
  console.log('');

  // Statistics
  const proofLengths = Object.values(proofs).map(p => p.proof.length);
  const avgProofLength = (proofLengths.reduce((a, b) => a + b, 0) / proofLengths.length).toFixed(2);
  const maxProofLength = Math.max(...proofLengths);
  const minProofLength = Math.min(...proofLengths);

  console.log('📊 Statistics:');
  console.log(`   Total Addresses: ${Object.keys(proofs).length}`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  console.log(`   Average Proof Length: ${avgProofLength} hashes`);
  console.log(`   Min/Max Proof Length: ${minProofLength}/${maxProofLength} hashes`);
  console.log('');

  // Show example
  const exampleAddress = snapshot.snapshot[0][0].toLowerCase();
  const exampleProof = proofs[exampleAddress];

  console.log('📄 Example Entry:');
  console.log(`   Address: ${exampleAddress}`);
  console.log(`   Index: ${exampleProof.index}`);
  console.log(`   Leaf Hash: ${exampleProof.leafHash}`);
  console.log(`   Proof Length: ${exampleProof.proof.length} hashes`);
  console.log(`   Claim Data: [${exampleProof.claimData.join(', ')}]`);
  console.log('');

  console.log('⚡ Performance Improvement:');
  console.log(`   Before: Build tree every time (~${buildTime + proofsTime}ms per user)`);
  console.log(`   After: Instant lookup (~1ms)`);
  console.log(`   Speedup: ${Math.round((buildTime + proofsTime) / 1)}x faster`);
  console.log('');

  console.log('✅ Next Steps:');
  console.log('   1. Update EligibilityChecker.tsx to load proofs.json');
  console.log('   2. Remove Merkle tree building from frontend');
  console.log('   3. Enjoy instant claim preparation! 🚀');
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
