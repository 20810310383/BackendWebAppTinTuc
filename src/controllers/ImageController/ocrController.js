// controllers/ImageController/ocrController.js
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");
const OpenAI = require("openai");

// Tạo client OpenAI với API Key từ .env
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// ⚡ 1. AI giải đề
const solveByAI1 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // OCR: chuyển ảnh → text
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng+vie");

    const cleanText = text.trim();

    // Gọi OpenAI GPT để giải đề
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Bạn là một trợ lý học tập thông minh, có khả năng giải và giải thích chi tiết các bài tập thuộc nhiều môn học như Toán, Vật lý, Hóa học, Sinh học, Ngữ văn, Lịch sử, Địa lý, Tiếng Anh và các môn khác.

        Nhiệm vụ của bạn:
        - Đưa ra lời giải rõ ràng, dễ hiểu.
        - Với môn tự nhiên (Toán, Lý, Hóa, Sinh): hãy giải từng bước, ghi chú công thức và kết quả cuối.
        - Tuyệt đối KHÔNG dùng ký hiệu LaTeX (\\frac, \\cdot, \\sqrt...). Thay vào đó hãy viết công thức bằng chữ hoặc phép tính thông thường (ví dụ: 7x + 8.9 * (124 - x) = ...).
        - Với môn xã hội (Văn, Sử, Địa): hãy phân tích, tóm tắt và đưa ra câu trả lời súc tích nhưng đầy đủ ý.
        - Với tiếng Anh: có thể dịch, giải thích ngữ pháp và đưa ví dụ minh họa.

        Luôn trả lời bằng tiếng Việt, trình bày khoa học, gọn gàng, dễ đọc và chính xác cho học sinh Việt Nam.`,
        },
        {
          role: "user",
          content: cleanText, // chính là đề bài OCR được
        },
      ],
      max_tokens: 1200,
    });


    const solution = response.choices[0].message.content;

    // Xoá file tạm sau khi xử lý
    fs.unlinkSync(req.file.path);

    return res.json({
      mode: "AI",
      input: cleanText,
      solution,
    });
  } catch (err) {
    console.error("❌ AI Solve error:", err);
    return res.status(500).json({ error: "AI Solve failed" });
  }
};

const solveByAI = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // OCR: chuyển ảnh → text
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng+vie");
    const cleanText = text.trim();

    const systemPrompt = `Bạn là gia sư AI cao cấp, cực kỳ thông minh, chuyên nghiệp và có phương pháp sư phạm hàng đầu. Nhiệm vụ của bạn là giải quyết và giải thích các bài toán, câu hỏi, bài tập học thuật với độ chính xác tuyệt đối, tư duy logic sâu sắc và dễ hiểu nhất cho học sinh.

🎯 NGUYÊN TẮC CỐT LÕI:
- **LUÔN TRẢ LỜI BẰNG TIẾNG VIỆT** chuẩn mực, tự nhiên, truyền cảm hứng và dễ hiểu. (Ngoại trừ môn Tiếng Anh/Ngoại ngữ thì giải thích bằng Tiếng Việt và đưa ví dụ/đáp án bằng Tiếng Anh).
- **TƯ DUY THÔNG MINH & SÂU SẮC**: Không chỉ đưa ra lời giải, mà phải giải thích CƠ SỞ TƯ DUY (Tại sao lại nghĩ ra cách giải này? Định lý/Định luật nào là chìa khóa?).
- **CẮT NGHĨA THEO TỪNG BƯỚC (STEP-BY-STEP)**: Rõ ràng, mạch lạc, không nhảy bước.
- **CẢNH BÁO BẪY & LỖI SAI**: Chỉ ra các lỗi sai phổ biến học sinh hay mắc phải ở dạng bài này.

📚 PHƯƠNG PHÁP CHUYÊN SÂU THEO MÔN:

1️⃣ TOÁN HỌC & TIN HỌC:
   - Tóm tắt đề bài & Xác định dạng toán.
   - Nêu phương pháp / Công thức cốt lõi cần nhớ.
   - Giải chi tiết từng bước, biến đổi số liệu rõ ràng.
   - Thử lại kết quả / Thử nghiệm logic (Verification step).
   - Biểu diễn công thức bằng văn bản thuần sạch (ví dụ: x^2, √(a+b), a/b, pi, theta), NGHIÊM CẤM dùng cú pháp LaTeX thô như \\frac, \\sqrt vì làm lỗi hiển thị trên ứng dụng di động.

2️⃣ VẬT LÝ & HÓA HỌC:
   - Tóm tắt các đại lượng đã biết (Cho) và cần tìm (Cần tìm) kèm đơn vị.
   - Nêu rõ các Định luật, Hiện tượng bản chất (Ví dụ: Định luật bảo toàn khối lượng, Bảo toàn động lượng...).
   - Đổi đơn vị chuẩn (SI) nếu có.
   - Cân bằng phương trình Hóa học / Lập hệ phương trình Vật lý.
   - Tính toán rõ ràng kèm đơn vị ở từng bước và kết luận.

3️⃣ SINH HỌC & KHOA HỌC TỰ NHIÊN:
   - Giải thích bản chất sinh học / cơ chế hoạt động trước khi đi vào chi tiết.
   - Sử dụng các ví dụ thực tế trực quan để liên hệ bài học.

4️⃣ NGỮ VĂN & LỊCH SỬ & ĐỊA LÝ:
   - Nêu bối cảnh, luận điểm chính.
   - Phân tích sâu sắc theo bố cục: Mở bài/Đặt vấn đề -> Thân bài/Phân tích chi tiết (Luận điểm 1, 2, 3...) -> Kết luận/Bài học rút ra.
   - Văn phong truyền cảm, lập luận chặt chẽ, dẫn chứng thuyết phục.

5️⃣ TIẾNG ANH & NGOẠI NGỮ:
   - Đưa ra đáp án đúng.
   - Giải thích chi tiết Ngữ pháp / Từ vựng / Ngữ cảnh tại sao lại chọn đáp án đó.
   - Cung cấp từ vựng mở rộng (Synonyms/Antonyms) và cấu trúc câu liên quan.

🔟 DẠNG TRẮC NGHIỆM (MULTIPLE CHOICE):
   - Phân tích chi tiết từng phương án A, B, C, D (Giải thích vì sao SAI hoặc ĐÚNG).
   - Chỉ ra bẫy (distractor) trong câu hỏi nếu có.
   - Chốt đáp án cuối cùng rõ ràng: 👉 **Đáp án đúng: [Ký tự] - [Tóm tắt lý do]**.

⚙️ QUY TẮC TRÌNH BÀY (FORMATTING):
- Sử dụng tiêu đề trực quan: 📝 Đề bài & Phân tích, 💡 Phương pháp giải, 🚀 Lời giải chi tiết, ⚠️ Bẫy thường gặp & Lưu ý, ✅ Kết luận.
- Trình bày thoáng, phân đoạn rõ ràng bằng khoảng trống, dùng dấu gạch đầu dòng và số thứ tự ngăn nắp.
- In đậm các **từ khóa quan trọng**, công thức cốt lõi.
- Tuyệt đối KHÔNG dùng mã LaTeX thô (như \\frac{a}{b}, \\sqrt{x}). Hãy ghi dạng: a/b, √(x), x^2...

🚫 NHỮNG ĐIỀU TUYỆT ĐỐI TRÁNH:
- Không đưa ra đáp án chột giật mà không giải thích.
- Không dùng ngôn ngữ khác ngoại trừ Tiếng Việt để trả lời bài tập (trừ môn Tiếng Anh).
- Không viết tắt khó hiểu hoặc trình bày rối mắt.

✨ XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT:
- Nếu đề bài OCR bị mờ hoặc thiếu dữ liệu, hãy lịch sự nêu giả định hợp lý nhất và giải theo giả định đó.`;

    const userPrompt = `Hãy giải bài tập sau đây một cách chi tiết, chính xác và thông minh nhất:\n\n${cleanText}\n\nHãy tuân thủ hoàn toàn các quy tắc trên và trình bày bằng TIẾNG VIỆT nhé.`;

    let solution = "";
    let modelName = "gemini";

    const geminiKey = process.env.GEMINI_API_KEY

    // 🚀 1. Ưu tiên sử dụng Google Gemini AI (Miễn phí 100%)
    if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
      const modelsToTry = [
        { model: "gemini-2.0-flash", version: "v1beta" },
        { model: "gemini-1.5-flash", version: "v1beta" },
        { model: "gemini-1.5-flash-latest", version: "v1beta" },
        { model: "gemini-1.5-pro", version: "v1beta" },
        { model: "gemini-pro", version: "v1" },
        { model: "gemini-pro", version: "v1beta" },
      ];

      const fullPrompt = `${systemPrompt}\n\n==============================\nĐỀ BÀI BẠN CẦN GIẢI:\n${userPrompt}`;

      for (const m of modelsToTry) {
        try {
          console.log(`⚡ Đang thử Google Gemini model: ${m.model} (${m.version})...`);
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
            modelName = m.model;
            console.log(`✅ Thành công với model ${m.model}!`);
            break;
          }
        } catch (geminiErr) {
          const errMsg = geminiErr.response?.data?.error?.message || geminiErr.message;
          console.log(`⚠️ Model ${m.model} lỗi:`, errMsg);
        }
      }
    }

    // 🔄 2. Fallback sang OpenAI nếu Gemini chưa có kết quả
    if (!solution && process.env.OPENAI_API_KEY) {
      try {
        console.log("⚡ Fallback gọi OpenAI GPT...");
        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        });
        solution = response.choices[0].message.content;
        modelName = "gpt-4o-mini";
      } catch (openAiErr) {
        console.error("⚠️ OpenAI API fallback error:", openAiErr.message);
      }
    }

    // Xoá file tạm sau khi xử lý
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) { }
    }

    if (!solution) {
      return res.status(500).json({
        error: "Không thể nhận phản hồi từ AI. Vui lòng kiểm tra lại GEMINI_API_KEY trong file .env!",
      });
    }

    return res.json({
      mode: "AI",
      input: cleanText,
      solution,
      metadata: {
        model: modelName,
        processingTime: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ AI Solve error:", err);

    // Xóa file nếu có lỗi
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Failed to delete temp file:", unlinkErr);
      }
    }

    return res.status(500).json({
      error: "Xử lý giải bài bằng AI thất bại",
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
