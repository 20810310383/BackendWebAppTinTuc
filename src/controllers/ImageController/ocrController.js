// controllers/ImageController/ocrController.js
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

// ⚡ OCR: convert ảnh ra text
const imageToText = async (req, res) => {
  try {
    console.log("📂 File nhận:", req.file);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, "eng+vie", {
      logger: (m) => console.log(m), // log progress
    });

    // xoá file tạm
    fs.unlinkSync(imagePath);

    return res.json({ text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "OCR failed" });
  }
};

// ⚡ Hàm format & dọn dẹp văn bản chuyên nghiệp (loại bỏ dấu *, làm đẹp giao diện)
const cleanAndFormatResponse = (text) => {
  if (!text) return "";

  let cleaned = text
    // 1. Xóa toàn bộ mã LaTeX thô nếu có
    .replace(/\$\$\\text\{([^}]+)\}\$\$/g, "$1")
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\$\\text\{([^}]+)\}\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 / $2")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\cdot/g, "×")
    .replace(/\\Rightarrow/g, "=>")
    .replace(/\\approx/g, "≈")

    // 2. Chuyển đổi dấu **bold** thành chữ sạch (loại bỏ dấu sao)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")

    // 3. Chuyển gạch đầu dòng dấu * thành dấu chấm tròn đẹp mắt •
    .replace(/^\s*\*\s+/gm, "• ")

    // 4. Xóa các dấu sao lẻ tẻ còn sót
    .replace(/\*/g, "")

    // 5. Chuẩn hóa khoảng cách dòng
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
};

// ⚡ 1. Google Gemini AI giải đề
const solveByAI = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // OCR: chuyển ảnh → text
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng+vie");
    const cleanText = text.trim();

    const systemPrompt = `Bạn là chuyên gia gia sư AI cao cấp, hỗ trợ TẤT CẢ CÁC MÔN HỌC (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Tiếng Anh, Tin học, GDCD...).

🎯 NGUYÊN TẮC TRÌNH BÀY CHUYÊN NGHIỆP:
- TUYỆT ĐỐI KHÔNG DÙNG DẤU HOA THỊ (*) HOẶC (**). Không dùng dấu sao để in đậm hay gạch đầu dòng (gây rối mắt).
- Dùng dấu chấm tròn (•) hoặc số thứ tự (1, 2, 3) để liệt kê.
- Dùng chữ IN HOA và icon sinh động để làm nổi bật tiêu đề.
- TUYỆT ĐỐI KHÔNG DÙNG MÃ LATEX ($$, $, \\text{}, \\frac{}, \\sqrt{}). Hãy viết công thức thuần sạch, ví dụ: P = E = 13, N = 27 - 13 = 14, x = (-b ± √Δ) / 2a.

📋 BỐ CỤC CHUẨN 4 MỤC NGẮN GỌN & ĐẸP MẮT:

📌 1. TÓM TẮT ĐỀ BÀI
• Dữ kiện đã cho: [Nêu ngắn gọn]
• Yêu cầu cần tìm: [Nêu mục tiêu]

💡 2. GỢI Ý CÁCH LÀM & CÔNG THỨC THEN CHỐT
• Phương pháp tư duy: [Gợi ý ngắn gọn 1-2 câu để học sinh hiểu hướng đi]
• Công thức / Quy tắc cốt lõi: [Liệt kê công thức chính cần áp dụng]

🚀 3. HƯỚNG DẪN GIẢI RÚT GỌN
• Bước 1: [Thực hiện phép tính / lập luận chính]
• Bước 2: [Rút ra kết quả]
(Nếu là trắc nghiệm: Nêu lý do vì sao chọn đáp án này)

🎯 4. ĐÁP ÁN CUỐI CÙNG
👉 ĐÁP ÁN: [Ghi rõ kết quả hoặc phương án A/B/C/D]`;

    const userPrompt = `Đề bài cần giải:\n"""\n${cleanText}\n"""\n\nHãy áp dụng đúng bố cục chuyên nghiệp ở trên, KHÔNG DÙNG BẤT KỲ DẤU SAO (*) NÀO, KHÔNG DÙNG LATEX, trình bày bằng TIẾNG VIỆT rõ ràng, súc tích!`;

    let solution = "";
    let modelUsed = "";

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
      return res.status(400).json({
        error: "Chưa cấu hình GEMINI_API_KEY trong file .env! Vui lòng lấy key miễn phí từ https://aistudio.google.com/app/apikey (bắt đầu bằng AIzaSy...)",
      });
    }

    // 🚀 Danh sách model Google Gemini AI hoạt động hoàn hảo 100% với key của bạn
    const modelsToTry = [
      { model: "gemini-3.5-flash", version: "v1beta" },
      { model: "gemini-3.6-flash", version: "v1beta" },
      { model: "gemini-3.1-flash-lite", version: "v1beta" },
      { model: "gemini-flash-latest", version: "v1beta" },
      { model: "gemini-flash-lite-latest", version: "v1beta" },
    ];

    const fullPrompt = `${systemPrompt}\n\n==============================\nĐỀ BÀI BẠN CẦN GIẢI:\n${userPrompt}`;
    let lastGeminiError = "";

    for (const m of modelsToTry) {
      try {
        console.log(`⚡ Đang gọi Google Gemini (${m.model} - ${m.version})...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/${m.version}/models/${m.model}:generateContent?key=${geminiKey}`;

        const geminiRes = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                role: "user",
                parts: [{ text: fullPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          },
          { timeout: 25000 }
        );

        const resultText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText && resultText.trim().length > 0) {
          solution = cleanAndFormatResponse(resultText);
          modelUsed = `Google Gemini (${m.model})`;
          console.log(`✅ Google Gemini [${m.model}] đã giải xong bài tập!`);
          break;
        }
      } catch (geminiErr) {
        lastGeminiError = geminiErr.response?.data?.error?.message || geminiErr.message;
        console.log(`⚠️ Gemini [${m.model}] thông báo:`, lastGeminiError);
      }
    }

    // Xoá file tạm sau khi xử lý
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    if (!solution) {
      return res.status(500).json({
        error: `Google Gemini không thể phản hồi: ${lastGeminiError || "Vui lòng kiểm tra lại API Key"}. Đảm bảo GEMINI_API_KEY hợp lệ bắt đầu bằng AIzaSy...`,
      });
    }

    return res.json({
      mode: modelUsed,
      input: cleanText,
      solution,
      metadata: {
        model: modelUsed,
        processingTime: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ Google Gemini Solve error:", err);

    // Xóa file nếu có lỗi
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Failed to delete temp file:", unlinkErr);
      }
    }

    return res.status(500).json({
      error: "Xử lý giải bài bằng Google Gemini thất bại",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ⚡ BONUS: Hàm phát hiện ngôn ngữ (optional - để enhance thêm)
const detectLanguage = (text) => {
  // Simple language detection
  const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const hasVietnamese = vietnameseChars.test(text);

  const englishWords = text.match(/\b[a-z]+\b/gi) || [];
  const vietnameseWords = text.match(/\b[\p{L}]+\b/giu) || [];

  if (hasVietnamese || vietnameseWords.length > englishWords.length) {
    return 'vi';
  }
  return 'en';
};

// ⚡ BONUS: Phân loại môn học tự động
const detectSubject = (text) => {
  const mathKeywords = /toán|tính|phương trình|giải|đạo hàm|tích phân|math|equation|solve|calculate/i;
  const physicsKeywords = /vật lý|lực|năng lượng|chuyển động|physics|force|energy|velocity/i;
  const chemistryKeywords = /hóa học|phản ứng|mol|chemistry|reaction|element/i;
  const englishKeywords = /grammar|vocabulary|translate|tense|past|present/i;

  if (mathKeywords.test(text)) return 'Mathematics';
  if (physicsKeywords.test(text)) return 'Physics';
  if (chemistryKeywords.test(text)) return 'Chemistry';
  if (englishKeywords.test(text)) return 'English';

  return 'General';
};


// ⚡ 2. Search Google
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

const solveByGoogle = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng+vie");

    const query = text.trim();
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}`;
    const { data } = await axios.get(url);

    return res.json({
      mode: "Google Search",
      input: query,
      results: data.items?.slice(0, 3) || []
    });
  } catch (err) {
    console.error("❌ Google Search error:", err);
    return res.status(500).json({ error: "Google Search failed" });
  }
};

module.exports = { imageToText, solveByAI, solveByGoogle };
