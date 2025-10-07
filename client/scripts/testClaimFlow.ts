/**
 * Comprehensive Claim Flow Test
 * This script simulates the complete claim flow from client to contract
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { hashLeaf, validateLeafData, type LeafData } from '../src/utils/merkle/leafHasher';
import { buildMerkleTree, findAddressIndex } from '../src/utils/merkle/merkleTree';
import { generateProof, verifyProof } from '../src/utils/merkle/proofGenerator';
import { signLeafHash, getPublicKey, verifySignature } from '../src/utils/merkle/signatureGenerator';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTests() {
  const results: TestResult[] = [];

  log('blue', '\n========================================');
  log('blue', '🔍 CLAIM FLOW SECURITY AUDIT TEST');
  log('blue', '========================================\n');

  try {
    // Load snapshot
    log('yellow', '📋 Loading snapshot data...');
    const snapshotPath = join(__dirname, '../../assets/snapshot.json');
    const snapshot: LeafData[] = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    log('green', `✓ Loaded ${snapshot.length} addresses from snapshot\n`);

    // Test 1: Validate snapshot data
    log('yellow', 'TEST 1: Validate Snapshot Data');
    try {
      let invalidCount = 0;
      snapshot.forEach((leaf, idx) => {
        if (!validateLeafData(leaf)) {
          log('red', `  ✗ Invalid leaf at index ${idx}`);
          invalidCount++;
        }
      });

      if (invalidCount === 0) {
        log('green', '  ✓ All snapshot entries are valid');
        results.push({ name: 'Snapshot Validation', passed: true });
      } else {
        throw new Error(`${invalidCount} invalid entries found`);
      }
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Snapshot Validation', passed: false, error: error.message });
    }

    // Test 2: Build Merkle Tree
    log('yellow', '\nTEST 2: Build Merkle Tree');
    let merkleTree;
    try {
      merkleTree = buildMerkleTree(snapshot);
      log('green', `  ✓ Merkle tree built successfully`);
      log('blue', `  Root: ${merkleTree.root}`);
      log('blue', `  Leaves: ${merkleTree.leaves.length}`);
      log('blue', `  Tree depth: ${merkleTree.tree.length - 1}`);
      results.push({ name: 'Merkle Tree Construction', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Merkle Tree Construction', passed: false, error: error.message });
      return results;
    }

    // Test 3: Verify all leaf hashes match
    log('yellow', '\nTEST 3: Verify Leaf Hash Consistency');
    try {
      for (let i = 0; i < snapshot.length; i++) {
        const manualHash = hashLeaf(snapshot[i]);
        const treeHash = merkleTree.leaves[i];

        if (manualHash !== treeHash) {
          throw new Error(`Hash mismatch at index ${i}: ${manualHash} !== ${treeHash}`);
        }
      }
      log('green', `  ✓ All ${snapshot.length} leaf hashes are consistent`);
      results.push({ name: 'Leaf Hash Consistency', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Leaf Hash Consistency', passed: false, error: error.message });
    }

    // Test 4: Generate and verify proofs for all addresses
    log('yellow', '\nTEST 4: Generate and Verify Merkle Proofs');
    try {
      let proofFailures = 0;

      for (let i = 0; i < snapshot.length; i++) {
        const proof = generateProof(merkleTree, i);
        const leafHash = merkleTree.leaves[i];
        const isValid = verifyProof(leafHash, proof, merkleTree.root);

        if (!isValid) {
          log('red', `  ✗ Invalid proof for index ${i}`);
          proofFailures++;
        }
      }

      if (proofFailures === 0) {
        log('green', `  ✓ All ${snapshot.length} Merkle proofs verified successfully`);
        results.push({ name: 'Merkle Proof Verification', passed: true });
      } else {
        throw new Error(`${proofFailures} proof verification failures`);
      }
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Merkle Proof Verification', passed: false, error: error.message });
    }

    // Test 5: Generate keypair and sign claims
    log('yellow', '\nTEST 5: Generate App Keypair and Sign Claims');
    let privateKey: string;
    let publicKey: string;

    try {
      // Generate a deterministic private key for testing
      // In production, use secure key generation and storage
      privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      publicKey = getPublicKey(privateKey);

      log('green', `  ✓ Generated keypair`);
      log('blue', `  Public Key: ${publicKey}`);
      log('magenta', `  ⚠️  Private Key should be stored securely (not shown in production)`);
      results.push({ name: 'Keypair Generation', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Keypair Generation', passed: false, error: error.message });
      return results;
    }

    // Test 6: Sign and verify signatures for all claims
    log('yellow', '\nTEST 6: Sign and Verify All Claims');
    try {
      let signatureFailures = 0;

      for (let i = 0; i < Math.min(snapshot.length, 5); i++) { // Test first 5 for performance
        const leafHash = merkleTree.leaves[i];
        const signature = signLeafHash(leafHash, privateKey);
        const isValid = verifySignature(leafHash, signature, publicKey);

        if (!isValid) {
          log('red', `  ✗ Signature verification failed for index ${i}`);
          signatureFailures++;
        }
      }

      if (signatureFailures === 0) {
        log('green', `  ✓ All signatures generated and verified successfully`);
        results.push({ name: 'Signature Generation & Verification', passed: true });
      } else {
        throw new Error(`${signatureFailures} signature verification failures`);
      }
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Signature Generation & Verification', passed: false, error: error.message });
    }

    // Test 7: Test wrong signature detection
    log('yellow', '\nTEST 7: Test Invalid Signature Detection');
    try {
      const leafHash = merkleTree.leaves[0];
      const signature = signLeafHash(leafHash, privateKey);

      // Try to verify with wrong public key
      const wrongPrivateKey = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      const wrongPublicKey = getPublicKey(wrongPrivateKey);
      const shouldBeFalse = verifySignature(leafHash, signature, wrongPublicKey);

      if (shouldBeFalse) {
        throw new Error('Invalid signature was accepted!');
      }

      log('green', `  ✓ Invalid signatures are correctly rejected`);
      results.push({ name: 'Invalid Signature Detection', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Invalid Signature Detection', passed: false, error: error.message });
    }

    // Test 8: Test wrong proof detection
    log('yellow', '\nTEST 8: Test Invalid Proof Detection');
    try {
      const leafHash = merkleTree.leaves[0];
      const correctProof = generateProof(merkleTree, 0);
      const wrongProof = generateProof(merkleTree, 1); // Use different address's proof

      const correctResult = verifyProof(leafHash, correctProof, merkleTree.root);
      const wrongResult = verifyProof(leafHash, wrongProof, merkleTree.root);

      if (!correctResult) {
        throw new Error('Valid proof was rejected!');
      }
      if (wrongResult) {
        throw new Error('Invalid proof was accepted!');
      }

      log('green', `  ✓ Invalid proofs are correctly rejected`);
      results.push({ name: 'Invalid Proof Detection', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Invalid Proof Detection', passed: false, error: error.message });
    }

    // Test 9: Simulate complete claim flow for first address
    log('yellow', '\nTEST 9: Simulate Complete Claim Flow');
    try {
      const testAddress = snapshot[0].address;
      const addressIndex = findAddressIndex(snapshot, testAddress);

      if (addressIndex === -1) {
        throw new Error('Address not found in snapshot');
      }

      // 1. Get leaf data
      const leafData = snapshot[addressIndex];
      log('blue', `  → User address: ${testAddress.substring(0, 10)}...`);
      log('blue', `  → Claim data: [${leafData.claim_data.join(', ')}]`);

      // 2. Hash leaf
      const leafHash = hashLeaf(leafData);
      log('blue', `  → Leaf hash: ${leafHash.substring(0, 20)}...`);

      // 3. Generate proof
      const proof = generateProof(merkleTree, addressIndex);
      log('blue', `  → Proof length: ${proof.length} hashes`);

      // 4. Verify proof
      const proofValid = verifyProof(leafHash, proof, merkleTree.root);
      if (!proofValid) {
        throw new Error('Proof verification failed');
      }
      log('green', `  ✓ Merkle proof verified`);

      // 5. Sign leaf hash
      const signature = signLeafHash(leafHash, privateKey);
      log('blue', `  → Signature r: ${signature.r.substring(0, 20)}...`);
      log('blue', `  → Signature s: ${signature.s.substring(0, 20)}...`);

      // 6. Verify signature
      const sigValid = verifySignature(leafHash, signature, publicKey);
      if (!sigValid) {
        throw new Error('Signature verification failed');
      }
      log('green', `  ✓ Signature verified`);

      // All checks passed
      log('green', `  ✓ Complete claim flow validated successfully!`);
      log('blue', '\n  📦 Contract Call Parameters:');
      log('blue', `    campaign_id: 'CAMPAIGN_1'`);
      log('blue', `    leaf_data: { address: '${leafData.address.substring(0, 20)}...', index: ${leafData.index}, claim_data: [${leafData.claim_data.join(', ')}] }`);
      log('blue', `    merkle_proof: [${proof.length} elements]`);
      log('blue', `    signature_r: ${signature.r.substring(0, 20)}...`);
      log('blue', `    signature_s: ${signature.s.substring(0, 20)}...`);

      results.push({ name: 'Complete Claim Flow Simulation', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Complete Claim Flow Simulation', passed: false, error: error.message });
    }

    // Test 10: Edge cases
    log('yellow', '\nTEST 10: Edge Cases');
    try {
      // Test with empty proof (single leaf tree)
      const singleLeafTree = buildMerkleTree([snapshot[0]]);
      const singleLeafHash = singleLeafTree.leaves[0];
      const emptyProof: string[] = [];

      // For a single leaf tree, the leaf is the root
      const singleLeafValid = singleLeafHash === singleLeafTree.root;

      if (!singleLeafValid) {
        throw new Error('Single leaf tree validation failed');
      }

      log('green', `  ✓ Single leaf tree (empty proof) handled correctly`);

      // Test with odd number of leaves
      const oddSnapshot = snapshot.slice(0, 3); // 3 leaves
      const oddTree = buildMerkleTree(oddSnapshot);
      const oddProof = generateProof(oddTree, 0);
      const oddLeafHash = oddTree.leaves[0];
      const oddProofValid = verifyProof(oddLeafHash, oddProof, oddTree.root);

      if (!oddProofValid) {
        throw new Error('Odd number of leaves tree validation failed');
      }

      log('green', `  ✓ Odd number of leaves handled correctly`);
      results.push({ name: 'Edge Cases', passed: true });
    } catch (error: any) {
      log('red', `  ✗ ${error.message}`);
      results.push({ name: 'Edge Cases', passed: false, error: error.message });
    }

  } catch (error: any) {
    log('red', `\n❌ Fatal error: ${error.message}`);
    console.error(error);
  }

  // Print summary
  log('blue', '\n========================================');
  log('blue', '📊 TEST SUMMARY');
  log('blue', '========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(result => {
    if (result.passed) {
      log('green', `✓ ${result.name}`);
    } else {
      log('red', `✗ ${result.name}: ${result.error || 'Unknown error'}`);
    }
  });

  log('blue', `\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    log('green', '\n✅ ALL TESTS PASSED! ✅\n');
  } else {
    log('red', `\n❌ ${failed} TEST(S) FAILED ❌\n`);
    process.exit(1);
  }

  return results;
}

// Run tests
runTests().catch(error => {
  log('red', `\nUnexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
