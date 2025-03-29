"use client";
import React, { useState } from "react";
import type { NextPage } from "next";
import { useWallet, CardanoWallet } from "@meshsdk/react";
import mintNFT from "../../cardano/main/mint";
import { PinataSDK } from "pinata";
import { deserializeAddress } from "@meshsdk/core";
import { encryptData } from "../../secret/enCryptAndDecrypt";
import { verify_did } from "../../cardano/main/verify_did";

// Định nghĩa các style để dùng xuyên suốt
const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif"
  },
  heading: {
    color: "#333",
    marginBottom: "20px"
  },
  button: {
    backgroundColor: "#3498db",
    color: "white",
    border: "none",
    padding: "10px 15px",
    margin: "10px 0",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.3s ease"
  },
  buttonHover: {
    backgroundColor: "#2980b9"
  },
  disabledButton: {
    backgroundColor: "#95a5a6",
    cursor: "not-allowed"
  },
  mintButton: {
    backgroundColor: "#2ecc71",
    color: "white",
    border: "none",
    padding: "12px 20px",
    margin: "15px 0",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  verifyButton: {
    backgroundColor: "#9b59b6",
    color: "white"
  },
  inputGroup: {
    marginBottom: "15px",
    width: "100%"
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    color: "#333"
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px"
  },
  textarea: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    minHeight: "100px",
    fontSize: "16px"
  },
  fileInput: {
    border: "1px solid #ddd",
    padding: "10px",
    borderRadius: "4px",
    width: "100%"
  },
  successText: {
    color: "#2ecc71",
    fontWeight: "bold"
  },
  errorText: {
    color: "#e74c3c",
    fontWeight: "bold"
  },
  divider: {
    margin: "20px 0",
    border: "0",
    borderTop: "1px solid #eee"
  },
  walletSection: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "5px"
  }
};

const Home: NextPage = () => {
  const { connected, wallet } = useWallet();

  // State của ví và tài sản
  const [assets, setAssets] = useState<null | any>(null);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);

  // State cho xác thực danh tính
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  // State để hiển thị form mint NFT nếu xác thực thất bại
  const [showMintForm, setShowMintForm] = useState<boolean>(false);

  // Các state cho Mint NFT
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [minting, setMinting] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");

    const JWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MzdkNzdiZC1kMWY2LTQyMWUtOGY2MC01OTgwZTMyOTdhOTEiLCJlbWFpbCI6Imxvbmd0ZC5hNWs0OGd0YkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZGNjYmY4MTA2ZDg1NjQzM2I1YWUiLCJzY29wZWRLZXlTZWNyZXQiOiIxZWM0YmE5YjQ3ZjllMjA1MzNlYTFiYmM5MjZkODIzOTJjZTcxODYyOWZjMmMwZWZjOTBjMWRiYjAxYTljN2IzIiwiZXhwIjoxNzc0NTI0MTMyfQ.IokET3UfMOUUe9EQaZ6y7iNOnJdKdu0rbzxeO0PKTSc";
    const pinataGateway = "emerald-managing-koala-687.mypinata.cloud";
    const pinata = new PinataSDK({
      pinataJwt: JWT,
      pinataGateway: pinataGateway,
    });

  // Hàm tạo random code
  const generateRandomCode = (length: number = 8): string => {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  };

  // Hàm lấy tài sản ví
  const getAssets = async () => {
    if (wallet) {
      setLoadingAssets(true);
      const _assets = await wallet.getAssets();
      setAssets(_assets);
      setLoadingAssets(false);
    }
  };

  // Hàm xác thực danh tính dựa trên danh sách NFT lưu trong DB
  const verifyIdentity = async () => {
    if (!wallet) return;
    setVerifying(true);
    try {
      const response = await fetch("/api/save", { method: "GET" });
      if (!response.ok) {
        throw new Error("Không lấy được danh sách NFT từ database");
      }
      const data = await response.json();
      const nftList = data.nfts || [];
      console.log("NFT list from database:", nftList);
      
      let verified = false;
      const key = "0000000000000000"; // key dùng cho encryptData
      
      // Duyệt qua các NFT và gọi verify_did
      for (const nft of nftList) {
        console.log(`Checking NFT: ${nft.title} with randomCode: ${nft.randomCode}`);
        const isValid = await verify_did(wallet, key, nft.randomCode);
        console.log(`Validation result for ${nft.title}: ${isValid}`);
        if (isValid) {
          verified = true;
          break;
        }
      }
      console.log("Final verification result:", verified);
      setIsVerified(verified);
    } catch (error) {
      console.error("Verification error:", error);
      alert(error);
      setIsVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  // Hàm mint NFT và sau đó quay lại xác thực danh tính
  const handleMint = async (): Promise<void> => {
    if (!file) {
      alert("Vui lòng chọn file ảnh");
      return;
    }
    if (!connected || !wallet) {
      alert("Ví chưa kết nối");
      return;
    }
    setMinting(true);
    try {
      // Upload file lên Pinata
      const uploadResult = await pinata.upload.public.file(file);
      if (!uploadResult || !uploadResult.cid) {
        throw new Error("Upload thất bại");
      }
      const ipfsUrl = `ipfs://${uploadResult.cid}`;

      // Lấy địa chỉ ví và giải mã ra pubKeyHash
      const useraddr = await wallet.getChangeAddress();
      const { pubKeyHash: userPubKeyHash } = deserializeAddress(useraddr);

      // Tạo random code và mã hóa
      const randomCode = generateRandomCode(8);
      const key = "0000000000000000";
      const hexRandomCode = encryptData(randomCode, key);

      // Tạo metadata cho NFT
      const metadata = {
        name: title,
        _pk: userPubKeyHash,
        image: ipfsUrl,
        mediaType: file.type,
        description: description,
        hexRandomCode,
      };

      // Gọi hàm mint NFT
      const tx = await mintNFT(wallet, title, metadata, {});
      setTxHash(tx);

      // Lưu thông tin NFT vào DB (lưu randomCode gốc)
      const saveResponse = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          randomCode, // randomCode gốc được lưu vào DB
          txHash: tx,
        }),
      });
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error("Lỗi lưu NFT từ API:", errorData);
        throw new Error("Lưu dữ liệu NFT thất bại: " + errorData.error);
      }
      alert("Mint NFT thành công! TxHash: " + tx);
      // Sau khi mint xong, quay lại xác thực danh tính
      await verifyIdentity();
      // Ẩn form mint
      setShowMintForm(false);
    } catch (error) {
      console.error("Mint NFT lỗi:", error);
      alert("Mint NFT thất bại!");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Connect Wallet</h1>
      <CardanoWallet />
      
      {connected && (
        <>
          <div style={styles.walletSection}>
            <h2>Get Wallet Assets</h2>
            {assets ? (
              <pre>
                <code className="language-js">
                  {JSON.stringify(assets, null, 2)}
                </code>
              </pre>
            ) : (
              <button
                type="button"
                onClick={getAssets}
                disabled={loadingAssets}
                style={{
                  ...styles.button,
                  ...(loadingAssets ? styles.disabledButton : {})
                }}
              >
                Get Wallet Assets
              </button>
            )}
          </div>

          <hr style={styles.divider} />

          {/* Phần xác thực danh tính */}
          <div>
            <h2>Xác Thực Danh Tính</h2>
            <button
              onClick={verifyIdentity}
              disabled={verifying}
              style={{
                ...styles.button,
                ...styles.verifyButton,
                ...(verifying ? styles.disabledButton : {})
              }}
            >
              {verifying ? "Đang xác thực..." : "Xác thực danh tính"}
            </button>
            {isVerified !== null && (
              <p style={isVerified ? styles.successText : styles.errorText}>
                {isVerified
                  ? "Bạn đã xác thực thành công!"
                  : "Bạn chưa được xác thực!"}
              </p>
            )}
          </div>

          {/* Nếu chưa được xác thực, hỏi người dùng có muốn mint NFT để xác thực không */}
          {isVerified === false && !showMintForm && (
            <div>
              <p>Bạn chưa được xác thực. Bạn có muốn mint NFT để xác thực không?</p>
              <button
                onClick={() => setShowMintForm(true)}
                style={styles.button}
              >
                Mint NFT
              </button>
            </div>
          )}

          {/* Form Mint NFT hiển thị khi người dùng đồng ý mint */}
          {showMintForm && (
            <div>
              <h2>Mint Your NFT</h2>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Upload Image</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  style={styles.fileInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={styles.input}
                  placeholder="Enter NFT title"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="Describe your NFT"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(parseInt(e.target.value, 10))
                  }
                  style={styles.input}
                />
              </div>
              <button
                onClick={handleMint}
                disabled={minting}
                style={{
                  ...styles.mintButton,
                  ...(minting ? styles.disabledButton : {})
                }}
              >
                {minting ? "Minting..." : "Mint NFT"}
              </button>
              {txHash && <p>Transaction Hash: {txHash}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
