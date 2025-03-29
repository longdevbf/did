import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POST: Lưu NFT mới
  if (req.method === "POST") {
    try {
      const { title, randomCode, txHash } = req.body;

      const nft = await prisma.nFT.create({
        data: {
          title,
          randomCode,
          txHash,
        },
      });

      res.status(200).json({ success: true, nft });
    } catch (error: any) {
      console.error("Lỗi lưu NFT:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // GET: Nếu có query title & randomCode thì trả về NFT tương ứng, nếu không có thì trả về toàn bộ NFT
  else if (req.method === "GET") {
    try {
      const { title, randomCode } = req.query;

      // Nếu không có query, trả về toàn bộ NFT
      if (!title && !randomCode) {
        const nfts = await prisma.nFT.findMany();
        return res.status(200).json({ success: true, nfts });
      }

      // Nếu có query, bắt buộc phải có cả title và randomCode
      if (!title || !randomCode) {
        return res.status(400).json({ 
          success: false, 
          error: "Cần cung cấp cả title và randomCode" 
        });
      }

      const nft = await prisma.nFT.findFirst({
        where: {
          title: String(title),
          randomCode: String(randomCode),
        },
      });

      if (!nft) {
        return res.status(404).json({ 
          success: false, 
          error: "Không tìm thấy NFT với title và randomCode cung cấp" 
        });
      }

      res.status(200).json({ success: true, nft });
    } catch (error: any) {
      console.error("Lỗi lấy NFT:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // Các method khác không được phép
  else {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
