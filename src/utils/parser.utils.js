const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

// Trích xuất từ Excel
exports.parseExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const cauHoiList = sheet.map((row) => {
    const dapAnKeys = Object.keys(row).filter(
      (key) => key.startsWith("DapAn_") && key !== "DapAnDung"
    );

    const dapAn = dapAnKeys.map((key) => {
      const ma = key.split("_")[1]; // Lấy "A", "B", ...
      return {
        ma,
        noiDung: row[key],
        isDung: row.DapAnDung === ma,
      };
    });

    return {
      noiDung: row.CauHoi,
      mucDo: row.MucDo || "trung_binh",
      giaiThich: row.GiaiThich || "",
      dapAn,
      tags: row.Tags ? row.Tags.split(",") : [],
    };
  });

  return cauHoiList;
};

// Trích xuất từ Word
exports.parseDocx = async (filePath) => {
  const content = await mammoth.extractRawText({ path: filePath });
  const lines = content.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return exports.parseDocxFromLines(lines);
};

// Trích xuất từ PDF
exports.parsePdf = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const text = data.text;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return exports.parseDocxFromLines(lines);
};

// Xử lý text từ Word/PDF
exports.parseDocxFromLines = (lines) => {
  const cauHoiList = [];
  let cauHoi = null;
  let collectingContent = [];
  let collectingAnswers = false;

  for (let line of lines) {
    if (/^\d+\./.test(line)) {
      // Nếu có câu trước đó, đẩy vào danh sách
      if (cauHoi) {
        // cauHoi.noiDung += "\n" + collectingContent.join("\n");
        cauHoi.noiDung += (collectingContent.length ? "\n" : "") + collectingContent.join("\n");
        cauHoiList.push(cauHoi);
      }

      // Tạo câu mới
      cauHoi = {
        noiDung: line.replace(/^\d+\.\s*/, '').trim(),
        dapAn: [],
        mucDo: 'trung_binh',
        tags: [],
        giaiThich: '',
      };
      collectingContent = [];
      collectingAnswers = false;
    } else if (/^[A-D]\./.test(line)) {
      // Bắt đầu phần đáp án
      collectingAnswers = true;
      const isDung = line.trim().endsWith('*');
      cauHoi.dapAn.push({
        ma: line[0],
        noiDung: line.slice(2).replace(/\s*\*$/, '').trim(),
        isDung,
      });
    } else if (/^Giải thích[:：]/i.test(line)) {
      cauHoi.giaiThich = line.replace(/^Giải thích[:：]/i, '').trim();
    } else {
      // Nếu đang thu thập nội dung câu hỏi
      if (!collectingAnswers) {
        collectingContent.push(line);
      }
    }
  }

  // Đẩy câu cuối cùng
  if (cauHoi) {
    // cauHoi.noiDung += "\n" + collectingContent.join("\n");
    cauHoi.noiDung += (collectingContent.length ? "\n" : "") + collectingContent.join("\n");

    cauHoiList.push(cauHoi);
  }

  return cauHoiList;
};

exports.parseDocxFromLines2 = (lines) => {
  const cauHoiList = [];
  let cauHoi = null;

  for (let line of lines) {
    if (/^\d+\./.test(line)) {
      // Gặp câu hỏi mới
      if (cauHoi) cauHoiList.push(cauHoi);
      cauHoi = {
        noiDung: line.replace(/^\d+\.\s*/, ''),
        dapAn: [],
        mucDo: 'trung_binh',
        tags: [],
      };
    } else if (/^[A-Z]\./.test(line)) {
      // Đáp án: A. ..., B. ...
      const isDung = line.trim().endsWith('*');
      cauHoi?.dapAn.push({
        ma: line[0],
        noiDung: line.slice(2).replace(/\s*\*$/, '').trim(),
        isDung,
      });
    } else if (line.toLowerCase().startsWith('giải thích:')) {
      // Giai thích
      const giaiThich = line.replace(/^Giải thích:/i, '').trim();
      if (cauHoi) {
        cauHoi.giaiThich = giaiThich;
      }
    }
  }

  if (cauHoi) cauHoiList.push(cauHoi);
  return cauHoiList;
};
