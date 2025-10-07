/**
 * Campaign Setup Script
 *
 * This script:
 * 1. Loads the snapshot of eligible addresses
 * 2. Builds a Merkle tree from the snapshot
 * 3. Generates proofs for each address
 * 4. Signs each leaf hash with the app's private key
 * 5. Outputs claim data that can be used by the frontend
 *
 * Usage: bun run scripts/setupCampaign.ts
 */

import fs from 'fs';
import path from 'path';
import { buildMerkleTree } from '../src/utils/merkle/merkleTree';
import { generateProof, verifyProof } from '../src/utils/merkle/proofGenerator';
import { signLeafHash, getPublicKey, verifySignature } from '../src/utils/merkle/signatureGenerator';
import { hashLeaf, LeafData, validateLeafData } from '../src/utils/merkle/leafHasher';

// Configuration
const SNAPSHOT_PATH = path.join(__dirname, '../../assets/snapshot.json');
const OUTPUT_PATH = path.join(__dirname, '../../assets/claimData.json');
const CAMPAIGN_ID = 'CAMPAIGN_1';

async function main() {
  console.log('🚀 Starting campaign setup...\n');

  // 1. Load and validate snapshot
  console.log('📋 Loading snapshot...');
  const snapshotRaw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
  const snapshot: LeafData[] = JSON.parse(snapshotRaw);

  console.log(`   Found ${snapshot.length} addresses in snapshot`);

  // Validate all entries
  for (const leaf of snapshot) {
    if (!validateLeafData(leaf)) {
      throw new Error(`Invalid leaf data for address: ${leaf.address}`);
    }
  }
  console.log('   ✓ All entries validated\n');

  // 2. Get private key from environment
  const privateKey = process.env.APP_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('APP_PRIVATE_KEY environment variable not set!\nPlease set it in your .env file');
  }

  // 3. Generate public key
  console.log('🔑 Generating public key...');
  const publicKey = getPublicKey(privateKey);
  console.log(`   Public Key: ${publicKey}`);
  console.log('   ⚠️  Set this in the contract using set_app_public_key()\n');

  // 4. Build Merkle tree
  console.log('🌳 Building Merkle tree...');
  const tree = buildMerkleTree(snapshot);
  console.log(`   Merkle Root: ${tree.root}`);
  console.log(`   Tree depth: ${tree.tree.length - 1}`);
  console.log('   ⚠️  Initialize drop with this root using initialize_drop()\n');

  // 5. Generate proofs and signatures
  console.log('📝 Generating proofs and signatures...');
  const claimData = snapshot.map((leaf, index) => {
    const leafHash = tree.leaves[index];
    const proof = generateProof(tree, index);
    const signature = signLeafHash(leafHash, privateKey);

    // Verify proof locally
    const proofValid = verifyProof(leafHash, proof, tree.root);
    if (!proofValid) {
      throw new Error(`Invalid proof generated for index ${index}`);
    }

    // Verify signature locally
    const sigValid = verifySignature(leafHash, signature, publicKey);
    if (!sigValid) {
      throw new Error(`Invalid signature generated for index ${index}`);
    }

    console.log(`   ✓ [${index}] ${leaf.address.substring(0, 10)}...`);

    return {
      address: leaf.address,
      index: leaf.index,
      claim_data: leaf.claim_data,
      leafHash,
      proof,
      signature
    };
  });

  console.log(`   Generated ${claimData.length} claim entries\n`);

  // 6. Save output
  console.log('💾 Saving claim data...');
  const output = {
    campaignId: CAMPAIGN_ID,
    merkleRoot: tree.root,
    publicKey,
    timestamp: new Date().toISOString(),
    totalClaims: claimData.length,
    claims: claimData
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`   Saved to: ${OUTPUT_PATH}\n`);

  // 7. Summary
  console.log('✅ Campaign setup complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Deploy your contract');
  console.log(`   2. Call set_app_public_key(${publicKey})`);
  console.log(`   3. Call initialize_drop("${CAMPAIGN_ID}", ${tree.root})`);
  console.log('   4. Users can now claim using the generated proof data\n');

  // 8. Generate example claim command
  const exampleClaim = claimData[0];
  console.log('📄 Example claim call:');
  console.log(`   claim(`);
  console.log(`     "${CAMPAIGN_ID}",`);
  console.log(`     { address: "${exampleClaim.address}", index: ${exampleClaim.index}, claim_data: [${exampleClaim.claim_data.join(', ')}] },`);
  console.log(`     [${exampleClaim.proof.map(p => `"${p}"`).join(', ')}],`);
  console.log(`     "${exampleClaim.signature.r}",`);
  console.log(`     "${exampleClaim.signature.s}"`);
  console.log(`   )\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
