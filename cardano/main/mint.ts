import {
    CIP68_222,
    stringToHex,
    mConStr0,
    CIP68_100,
    metadataToCip68,
    deserializeAddress,
    MeshTxBuilder,
    applyParamsToScript,
    resolveScriptHash,
    serializeAddressObj,
    serializePlutusScript,
    scriptAddress
  } from "@meshsdk/core";
  import plutus from '../../contract/plutus.json';
  import { getWalletInfoForTx, blockchainProvider } from '../../cardano/utils/adapter';
  
  // Constants
  const NETWORK_ID = 0;
  const PLATFORM_FEE = '1000000';
  const DEFAULT_EXCHANGE_ADDRESS = "addr_test1qqwkave5e46pelgysvg6mx0st5zhte7gn79srscs8wv2qp5qkfvca3f7kpx3v3rssm4j97f63v5whrj8yvsx6dac9xrqyqqef6";
  
  /**
   * Reads validator from blueprint
   */
  function readValidator(title: string): string {
    const validator = plutus.validators.find(v => v.title === title);
    if (!validator) throw new Error(`${title} validator not found.`);
    return validator.compiledCode;
  }
  
  /**
   * Mint a CIP68 NFT token
   * 
   * @param wallet - Connected wallet instance
   * @param tokenName - Name for the NFT
   * @param metadata - Complete metadata object for the NFT (created externally)
   * @param options - Optional parameters (platformFee, exchangeAddress)
   * @returns Transaction hash
   */
  export async function mintNFT(
    wallet: any, 
    tokenName: string,
    metadata: any,
    options?: {
      platformFee?: string,
      exchangeAddress?: string
    }
  ): Promise<string> {
    try {
      // Settings
      const platformFee = options?.platformFee || PLATFORM_FEE;
      const exChange = options?.exchangeAddress || DEFAULT_EXCHANGE_ADDRESS;
      
      // Setup
      const { utxos, walletAddress, collateral } = await getWalletInfoForTx(wallet);
      const { pubKeyHash: userPubKeyHash } = deserializeAddress(walletAddress);
      const pubkeyExchange = deserializeAddress(exChange).pubKeyHash;
      
      // Get validator scripts
      const mintCompilecode = readValidator("mint.mint.mint");
      const storeCompilecode = readValidator("store.store.spend");
      
      // Setup script addresses
      const storeScriptCbor = applyParamsToScript(storeCompilecode, [pubkeyExchange, BigInt(1), userPubKeyHash]);
      const storeScript = {
        code: storeScriptCbor,
        version: "V3" as "V3",
      };
      
      const storeAddress = serializeAddressObj(
        scriptAddress(
          deserializeAddress(serializePlutusScript(storeScript, undefined, 0, false).address).scriptHash,
          deserializeAddress(exChange).stakeCredentialHash,
          false,
        ),
        0,
      );
      
      // Create transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider
      });
      
      // Calculate script hashes and policy ID
      const storeScriptHash = deserializeAddress(storeAddress).scriptHash;
      const mintScriptCbor = applyParamsToScript(mintCompilecode, [
        pubkeyExchange,
        BigInt(1),
        storeScriptHash,
        deserializeAddress(exChange).stakeCredentialHash,
        userPubKeyHash,
      ]);
      
      const policyId = resolveScriptHash(mintScriptCbor, "V3");
      const hexAssetName = stringToHex(tokenName);
      
      // Start building transaction
      const unsignedTx = txBuilder.mintPlutusScriptV3();
      
      // Build the transaction
      unsignedTx
        // Mint user token (CIP68_222)
        .mint("1", policyId, CIP68_222(hexAssetName))
        .mintingScript(mintScriptCbor)
        .mintRedeemerValue(mConStr0([]))
        
        // Mint reference token (CIP68_100)
        .mintPlutusScriptV3()
        .mint("1", policyId, CIP68_100(hexAssetName))
        .mintingScript(mintScriptCbor)
        .mintRedeemerValue(mConStr0([]))
        
        // Store reference token with metadata
        .txOut(storeAddress, [
          {
            unit: policyId + CIP68_100(hexAssetName),
            quantity: "1"
          }
        ])
        .txOutInlineDatumValue(metadataToCip68(metadata))
        
        // Send user token to wallet
        .txOut(walletAddress, [
          {
            unit: policyId + CIP68_222(hexAssetName),
            quantity: "1"
          },   
        ])
        
        // Add platform fee payment
        .txOut(exChange, [
          {
            unit: "lovelace",
            quantity: platformFee
          }
        ])
        .changeAddress(walletAddress)
        .requiredSignerHash(userPubKeyHash)
        .selectUtxosFrom(utxos)
        .txInCollateral(
          collateral.input.txHash, 
          collateral.input.outputIndex, 
          collateral.output.amount, 
          collateral.output.address
        )
        .setNetwork("preprod")
        .addUtxosFromSelection();
      
      // Complete, sign, and submit
      const completedTx = await unsignedTx.complete();
      const signedTx = await wallet.signTx(completedTx, true);
      const txHash = await wallet.submitTx(signedTx);
      
      return txHash;
    } catch (error) {
      console.error("Mint error:", error);
      throw error;
    }
  }
  
  export default mintNFT;