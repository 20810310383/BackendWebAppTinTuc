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

// ⚡ 1. Google Gemini AI giải đề
const solveByAI = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // OCR: chuyển ảnh → text
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng+vie");
    const cleanText = text.trim();

    const systemPrompt = `Bạn là trợ lý học tập AI thông minh, hỗ trợ TẤT CẢ CÁC MÔN HỌC (Toán, Vật lý, Hóa học, Sinh học, Ngữ văn, Lịch sử, Địa lý, Tiếng Anh, Tin học, GDCD...).

🎯 NGUYÊN TẮC QUAN TRỌNG:
- **TÓM TẮT & GỢI Ý CÔNG THỨC**: Trình bày ngắn gọn, súc tích, trực diện, không dài dòng lê thê. Đưa ra hướng giải và công thức cốt lõi trước để người học nắm bắt nhanh.
- **TUYỆT ĐỐI KHÔNG DÙNG MÃ LATEX THÔ**: Nghiêm cấm hoàn toàn ký hiệu như $$, $, \\text{}, \\frac{}, \\sqrt{}, \\cdot, \\Delta vì gây lỗi hiển thị trên điện thoại.
  👉 Thay bằng ký hiệu thuần dễ đọc:
  - Công thức: P = E = 13, N = Tổng hạt - P = 14
  - Toán/Lý: x = (-b ± √Δ) / 2a, v = s / t, P = U * I
  - Hóa học: n = m / M, Fe + 2HCl -> FeCl2 + H2
  - Tiếng Anh: Cấu trúc: S + have/has + V3/ed (Hiện tại hoàn thành)

📋 BỐ CỤC TRÌNH BÀY RÚT GỌN (NGẮN GỌN - DỄ HIỂU - ĐẦY ĐỦ Ý):

📌 1. Tóm tắt đề bài
- Nêu nhanh dữ kiện đã cho & yêu cầu cần tìm.

💡 2. Gợi ý cách làm & Công thức then chốt
- Nêu ngắn gọn phương pháp tư duy / bản chất câu hỏi.
- Liệt kê các công thức hoặc quy tắc cốt lõi cần dùng.

🚀 3. Hướng dẫn giải (Rút gọn)
- Trình bày tóm tắt 2-3 bước chính để ra kết quả.
- Với trắc nghiệm: Chỉ rõ tại sao chọn phương án đó (loại trừ phương án sai ngắn gọn).

🎯 4. Đáp án / Kết luận
- 👉 **Đáp án:** [Kết quả cuối cùng / Phương án đúng]

✨ YÊU CẦU TRÌNH BÀY:
- Dùng emoji sinh động (📌, 💡, 🚀, 🎯, ⚠️).
- Cách dòng thoáng, in đậm từ khóa quan trọng, ngắn gọn súc tích dễ đọc trên điện thoại.`;

    const userPrompt = `Đề bài cần giải:\n"""\n${cleanText}\n"""\n\nHãy tóm tắt đề, đưa ra công thức/quy tắc then chốt và hướng dẫn giải ngắn gọn, súc tích bằng TIẾNG VIỆT, KHÔNG dùng bất kỳ mã LaTeX nào!`;

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
          solution = resultText.trim();
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
