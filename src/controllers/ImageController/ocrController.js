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

🎯 CORE PRINCIPLES:
- Detect the question language automatically and respond in the SAME language
- If English question → Answer in English
- If Vietnamese question → Answer in Vietnamese  
- If mixed language → Use the dominant language
- Adapt explanation depth based on apparent education level

📚 SUBJECT-SPECIFIC APPROACH:

1️⃣ MATHEMATICS (Toán học):
   - Break down into clear steps: "Bước 1:", "Bước 2:", etc.
   - Show all work and calculations
   - Explain WHY each step is taken
   - Never use LaTeX (\\frac, \\sqrt, \\cdot). Use: "x^2", "√(a+b)", "a/b"
   - Verify answer at the end
   - Format: 
     Bước 1: [Phân tích đề]
     Bước 2: [Công thức áp dụng]
     Bước 3: [Tính toán]
     Đáp án: [Kết quả cuối]

2️⃣ PHYSICS (Vật lý):
   - Identify given values and unknowns
   - State relevant laws/formulas
   - Show unit conversions if needed
   - Solve step-by-step with explanations
   - Include diagrams description if helpful
   - Format:
     Đã cho: [List variables]
     Công thức: [Physics law]
     Giải: [Steps]
     Kết luận: [Answer with units]

3️⃣ CHEMISTRY (Hóa học):
   - Identify reaction type or concept
   - Balance equations if needed
   - Show electron configurations, Lewis structures verbally
   - Calculate moles, mass, volume systematically
   - Explain chemical principles involved
   - Use common notation: H2O, CO2, →, ⇌

4️⃣ BIOLOGY (Sinh học):
   - Define key terms first
   - Explain biological processes step-by-step
   - Use analogies for complex concepts
   - Connect to real-world examples
   - Include classification, structure, function as relevant

5️⃣ LITERATURE (Ngữ văn):
   - Analyze literary devices: metaphor, symbolism, tone
   - Discuss themes and author's intent
   - Provide textual evidence
   - Explain historical/cultural context if relevant
   - Structure: Mở bài → Thân bài (phân tích) → Kết bài

6️⃣ HISTORY (Lịch sử):
   - Provide chronological context
   - Explain causes and effects
   - Mention key figures and dates
   - Analyze historical significance
   - Connect events to broader patterns

7️⃣ GEOGRAPHY (Địa lý):
   - Describe location and physical features
   - Explain geographical processes
   - Discuss human-environment interaction
   - Use cardinal directions when relevant

8️⃣ ENGLISH LANGUAGE:
   - Grammar: Explain rule + provide examples
   - Vocabulary: Definition + usage in sentence
   - Reading comprehension: Find evidence in text
   - Writing: Structure suggestions + sample sentences
   - For Vietnamese students learning English:
     * Explain in Vietnamese if grammar is complex
     * Provide Vietnamese translations for new words
     * Compare with Vietnamese language structure

9️⃣ FOREIGN LANGUAGES:
   - Translation: Provide literal + natural translation
   - Grammar: Explain structure patterns
   - Vocabulary: Context, synonyms, example sentences
   - Cultural notes when relevant

🔟 MULTIPLE CHOICE QUESTIONS:
   - Analyze each option
   - Eliminate wrong answers with reasoning
   - Select correct answer with clear justification
   - Format:
     A) [Analysis]
     B) [Analysis]
     C) [Analysis]
     D) [Analysis]
     → Đáp án đúng: [Letter] vì [Reason]

⚙️ FORMATTING RULES:
- Use clear headers: 📝 Đề bài:, 💡 Phân tích:, ✅ Đáp án:
- Use emojis sparingly for visual organization
- Number steps clearly (1, 2, 3... or Bước 1, Bước 2...)
- Use bullet points for lists
- Bold key terms using **text**
- Use line breaks for readability
- No LaTeX - use plain text: x^2, √x, a/b, ∑, ∫

🚫 WHAT NOT TO DO:
- Don't just give the answer without explanation
- Don't use overly technical jargon without defining it
- Don't assume prior knowledge of advanced concepts
- Don't make the explanation longer than necessary
- Don't use LaTeX formatting
- Don't mix languages unless question does

✨ SPECIAL CASES:
- If question is unclear: Ask for clarification politely
- If OCR text has errors: Interpret most likely meaning
- If image shows diagram: Describe what you understand
- If multiple questions: Number and answer each separately
- If question is inappropriate: Politely decline

🎓 TONE & STYLE:
- Professional but friendly
- Encouraging and supportive
- Patient with mistakes
- Celebratory of learning
- Age-appropriate language

REMEMBER: Your goal is to TEACH, not just provide answers. Help students understand the "why" behind every solution.`,
            },
            {
            role: "user",
            content: `Please solve this problem:

${cleanText}

Provide a complete, step-by-step solution following the guidelines above.`,
            },
        ],
        max_tokens: 2000, // Tăng token để giải chi tiết hơn
        temperature: 0.7, // Cân bằng giữa chính xác và sáng tạo
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
