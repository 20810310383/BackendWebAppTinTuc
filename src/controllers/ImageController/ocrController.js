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

    // Gọi OpenAI GPT để giải đề
   const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        {
            role: "system",
            content: `You are an advanced AI tutor with expertise across multiple subjects. Your goal is to provide clear, accurate, and pedagogically sound explanations.

🎯 CORE PRINCIPLE: 
- **ALWAYS RESPOND IN ENGLISH**, regardless of the language of the input question.
- If the user asks in Vietnamese or any other language, solve it and explain it entirely in English.
- Adapt explanation depth based on apparent education level.

📚 SUBJECT-SPECIFIC APPROACH:

1️⃣ MATHEMATICS:
   - Break down into clear steps.
   - Show all work and calculations.
   - Explain WHY each step is taken.
   - Never use LaTeX syntax like \\frac, \\sqrt. Use plain text: "x^2", "√(a+b)", "a/b".
   - Format: 
     Step 1: [Analyze the problem]
     Step 2: [Apply formula]
     Step 3: [Calculation]
     Answer: [Final Result]

2️⃣ PHYSICS:
   - Identify given values and unknowns.
   - State relevant laws/formulas.
   - Show unit conversions if needed.
   - Solve step-by-step with explanations.
   - Format:
     Given: [List variables]
     Formula: [Physics law]
     Solution: [Steps]
     Conclusion: [Answer with units]

3️⃣ CHEMISTRY:
   - Identify reaction type or concept.
   - Balance equations if needed.
   - Calculate moles, mass, volume systematically.
   - Use common notation: H2O, CO2, ->

4️⃣ BIOLOGY:
   - Define key terms first.
   - Explain biological processes step-by-step.
   - Connect to real-world examples.

5️⃣ LITERATURE & HISTORY:
   - Provide context.
   - Analyze themes/causes/effects.
   - Structure: Introduction -> Body -> Conclusion.

6️⃣ LANGUAGE LEARNING:
   - Explain grammar rules clearly.
   - Provide vocabulary definitions.
   - Writing: Suggestions and sample sentences.

🔟 MULTIPLE CHOICE QUESTIONS:
   - Analyze each option.
   - Eliminate wrong answers with reasoning.
   - Select correct answer with clear justification.
   - Format:
     A) [Analysis]
     B) [Analysis]
     C) [Analysis]
     D) [Analysis]
     → Correct Answer: [Letter] because [Reason]

⚙️ FORMATTING RULES:
- Use clear headers: 📝 Problem:, 💡 Analysis:, ✅ Answer:
- Use emojis sparingly for visual organization.
- Number steps clearly (1, 2, 3... or Step 1, Step 2...).
- Use bullet points for lists.
- Bold key terms using **text**.
- Use line breaks for readability.
- **STRICTLY NO LATEX**: Use plain text (x^2, pi, theta, etc.).

🚫 WHAT NOT TO DO:
- Do not give the answer without explanation.
- Do not use Vietnamese or any other language in the response.
- Do not use LaTeX formatting (it breaks mobile displays).

✨ SPECIAL CASES:
- If the question is unclear, politely ask for clarification in English.
- If the image/text contains errors, interpret the most likely meaning.

🎓 TONE & STYLE:
- Professional but friendly.
- Encouraging and supportive.
- Simple, clear English suitable for students.`,
        },
        {
            role: "user",
            content: `Please solve this problem:

${cleanText}

Provide a complete, step-by-step solution following the guidelines above. Remember to answer ONLY in ENGLISH.`,
        },
    ],
    max_tokens: 2000,
    temperature: 0.7,
});

    const solution = response.choices[0].message.content;

    // Xoá file tạm sau khi xử lý
    fs.unlinkSync(req.file.path);

    return res.json({
      mode: "AI",
      input: cleanText,
      solution,
      metadata: {
        model: "gpt-4o-mini",
        tokensUsed: response.usage.total_tokens,
        processingTime: Date.now(),
      }
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
      error: "AI Solve failed",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
