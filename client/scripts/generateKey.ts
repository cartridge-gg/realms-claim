/**
 * Generate a private key for signing claims
 *
 * Usage: bun run scripts/generateKey.ts
 *
 * IMPORTANT: Keep the private key secure! Add it to .env as APP_PRIVATE_KEY
 */

import { generatePrivateKey, getPublicKey } from '../src/utils/merkle/signatureGenerator';

function main() {
  console.log('🔑 Generating new key pair...\n');

  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);

  console.log('Private Key (KEEP SECRET):');
  console.log(privateKey);
  console.log('\nPublic Key (set in contract):');
  console.log(publicKey);
  console.log('\n⚠️  IMPORTANT:');
  console.log('1. Add the private key to your .env file as APP_PRIVATE_KEY');
  console.log('2. Set the public key in your contract using set_app_public_key()');
  console.log('3. Never commit the private key to version control!');
  console.log('\n💡 Add this to your .env:');
  console.log(`APP_PRIVATE_KEY=${privateKey}`);
}

main();
