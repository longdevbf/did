import {
  BlockfrostProvider,
  CIP68_100,
  CIP68_222,
  deserializeAddress,
  deserializeDatum,
} from "@meshsdk/core";
import { blockchainProvider } from "../utils/adapter";
import {
  convertHexToString,
  decryptData,
  encryptData,
} from "../../secret/enCryptAndDecrypt";

interface ParsedAsset {
  unit: string;
  policyId: string;
  assetName: string;
  assetNameHex: string;
  quantity: string;
}

interface ParsedMetaData {
  name: string;
  image: string;
  _pk: string;
  fingerprint: string;
  totalSupply: string;
  hexRandomCode: string;
}

export async function verify_did(wallet: any, key: string, RandomCode: string) {
  if (!wallet || !key || !RandomCode) {
    console.error("Missing required parameters for verification");
    return false;
  }

  // Mã hóa RandomCode từ database thành hexRandomCode để so sánh
  const encryptedRandomCode = encryptData(RandomCode, key);
  const walletAddress = await wallet.getChangeAddress();
  const assetsInfoWallet = await blockchainProvider.fetchAddressAssets(
    walletAddress,
  );
  const { pubKeyHash: userPubkeyHash } = deserializeAddress(walletAddress);

  for (const [unit, quantity] of Object.entries(assetsInfoWallet)) {
    if (unit === "lovelace") {
      continue;
    }

    const policyId = unit.slice(0, 56);
    const assetNameHex = unit.slice(56);

    try {
      let assetName = Buffer.from(assetNameHex, "hex").toString("utf8");
      // Kiểm tra NFT có đúng định dạng không - loại bỏ kiểm tra này để xem tất cả NFT
      if (assetNameHex.startsWith("000de140")) {
        let unitAsset = policyId + assetNameHex;
        const metadata = await blockchainProvider.fetchAssetMetadata(
          unitAsset.toString(),
        );

        if (metadata && metadata._pk) {
          const walletPubKeyHash = deserializeAddress(walletAddress).pubKeyHash;
          const pkWithoutPrefix = metadata._pk.substring(4);

          const check1 = pkWithoutPrefix === walletPubKeyHash;

          if (!metadata.hexRandomCode) {
            console.error("Missing hexRandomCode in metadata");
            continue;
          }

          try {
            // Chuyển đổi từ hex string về chuỗi gốc
            const convertedHexRandomCode = convertHexToString(
              metadata.hexRandomCode,
            );

            // So sánh sau khi đã chuyển đổi
            const check2 = convertedHexRandomCode === encryptedRandomCode;

            if (check1 && check2) {
              console.log("Verification successful!");
              return true;
            }
          } catch (error) {
            console.error("Error comparing hexRandomCode:", error);
            continue;
          }
        }
      }
    } catch (error) {
      console.error("Error processing asset:", unit, error);
      continue;
    }
  }

  console.log("Verification failed - no matching NFT found");
  return false;
}
