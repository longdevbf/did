import CryptoJS from "crypto-js";

function encryptData(data: any, secretKey: string) {
  if (!data) {
    console.error("Cannot encrypt empty or undefined data");
    return "";
  }
  
  const encrypted = CryptoJS.AES.encrypt(
    data,
    CryptoJS.enc.Utf8.parse(secretKey),
    {
      keySize: 128 / 8,
      iv: CryptoJS.enc.Utf8.parse(secretKey),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString();
  return encrypted;
}

function decryptData(encryptedData: any, secretKey: string) {
  try {
    // Validate input
    if (!encryptedData) {
      console.error("Cannot decrypt empty or undefined data");
      return "";
    }
    
    // Handle the encryption format properly
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData.toString(),
      CryptoJS.enc.Utf8.parse(secretKey),
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secretKey),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    
    // Safely convert and return the decrypted data
    try {
      const originalData = decrypted.toString(CryptoJS.enc.Utf8);
      return originalData;
    } catch (parseError) {
      console.error("Error parsing decrypted data:", parseError);
      return "";
    }
  } catch (error) {
    console.error("Decryption error:", error);
    return "";
  }
}

// Hàm chuyển đổi chuỗi HEX từ metadata về chuỗi thông thường
function convertHexToString(hexString: string): string {
  // Loại bỏ prefix CBOR nếu có (thường là 5818)
  let hexWithoutPrefix = hexString;
  if (hexString.startsWith('5818')) {
    hexWithoutPrefix = hexString.slice(4);
  }
  
  // Chuyển đổi HEX thành mảng các byte
  const bytes = [];
  for (let i = 0; i < hexWithoutPrefix.length; i += 2) {
    bytes.push(parseInt(hexWithoutPrefix.substr(i, 2), 16));
  }
  
  // Chuyển đổi mảng byte thành chuỗi UTF-8
  return String.fromCharCode.apply(null, bytes);
}

export { encryptData, decryptData, convertHexToString };