// routes/tiktokRouter.js
const express = require('express');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const sanitize = require('sanitize-filename');
const archiver = require('archiver');
const bcrypt = require("bcrypt");

const router = express.Router();
ffmpeg.setFfmpegPath(ffmpegPath);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const COMMON_HEADERS = { 'User-Agent': UA, Referer: 'https://www.tikwm.com/' };

/** Helper: build Content-Disposition an toàn (ASCII + UTF-8) */
function buildContentDisposition(filenameWithExt) {
  const cleaned = String(filenameWithExt).replace(/[\r\n]/g, ' ').trim();
  const fallback =
    sanitize(cleaned)
      .replace(/[^\x20-\x7E]+/g, '_')
      .replace(/"/g, "'") || 'file';
  const encoded = encodeURIComponent(cleaned);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** ✅ Lấy metadata từ TikWM (có retry & delay) */
async function getTikTokMeta(tiktokUrl, retry = 2) {
  if (!tiktokUrl) throw new Error('Thiếu tham số "url".');

  const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;

  for (let i = 0; i <= retry; i++) {
    try {
      const res = await axios.get(api, { headers: COMMON_HEADERS, timeout: 25000 });
      if (!res.data || res.data.code !== 0) {
        throw new Error(res.data?.msg || 'Không lấy được metadata từ TikWM');
      }
      const d = res.data.data || {};
      return {
        title: d.title || 'tiktok_video',
        author: d.author?.unique_id || d.author?.nickname || 'author',
        duration: d.duration,
        cover: d.cover,
        videoNoWM: d.play || d.hdplay,
        videoHD: d.hdplay || d.play,
        music: d.music,
      };
    } catch (err) {
      console.warn(`⚠️ Lỗi TikWM (thử lần ${i + 1}): ${err.message}`);
      if (i < retry) await new Promise((r) => setTimeout(r, 1000)); // đợi 1s rồi thử lại
    }
  }

  throw new Error('Không lấy được metadata từ TikWM sau nhiều lần thử.');
}

/** Proxy stream file */
async function proxyFile(res, fileUrl, filenameWithExt, contentType) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', buildContentDisposition(filenameWithExt));
  const streamRes = await axios.get(fileUrl, {
    responseType: 'stream',
    headers: COMMON_HEADERS,
    timeout: 30000,
  });
  streamRes.data.pipe(res);
}

/** GET /api/tiktok/info */
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    const meta = await getTikTokMeta(url);
    return res.json({ ok: true, data: meta });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e.message || 'Lỗi không xác định' });
  }
});

/** GET /api/tiktok/download */
router.get('/download', async (req, res) => {
  try {
    const { url, type = 'video' } = req.query;
    const meta = await getTikTokMeta(url);

    const baseName = `${meta.author}-${meta.title}`.slice(0, 120) || 'tiktok';
    const videoUrl = meta.videoHD || meta.videoNoWM;

    if (type === 'audio') {
      if (meta.music) {
        return proxyFile(res, meta.music, `${baseName}.mp3`, 'audio/mpeg');
      }
      if (!videoUrl) throw new Error('Không tìm thấy nguồn video để tách audio.');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', buildContentDisposition(`${baseName}.mp3`));
      ffmpeg(videoUrl)
        .addOptions(['-vn'])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .format('mp3')
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
          if (!res.headersSent) res.status(500).end('Không tách được audio.');
        })
        .pipe(res, { end: true });
      return;
    }

    if (!videoUrl) throw new Error('Không tìm thấy link MP4 không logo.');
    return proxyFile(res, videoUrl, `${baseName}.mp4`, 'video/mp4');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(400).json({ ok: false, message: e.message || 'Tải thất bại' });
    }
  }
});

/** ✅ POST /api/tiktok/batch/download — tải nhiều video → ZIP */
router.post('/batch/download', async (req, res) => {
  try {
    const { urls, password } = req.body;
    console.log("mk>> ",password);
    
    // ✅ kiểm tra mật khẩu
    const HASH = 'storymixapp'; 
    const isMatch = await bcrypt.compare(password, HASH);
    if (password !== HASH) {
      return res.status(403).json({ ok: false, message: "Mật khẩu không đúng. Vui lòng liên hệ admin để cấp mật khẩu!" });
    }

    if (!Array.isArray(urls) || urls.length === 0)
      return res.status(400).json({ ok: false, message: 'Thiếu danh sách URL.' });

    const zipName = `tiktok_videos_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const url of urls) {
      try {
        console.log(`📥 Đang xử lý: ${url}`);
        const meta = await getTikTokMeta(url);
        const videoUrl = meta.videoHD || meta.videoNoWM;
        if (!videoUrl) throw new Error('Không tìm thấy video hợp lệ.');

        const safeName = sanitize(`${meta.author}-${meta.title}`.slice(0, 100)) || 'video';
        const fileName = `${safeName}.mp4`;

        console.log(`⬇️ Tải video: ${fileName}`);
        const videoRes = await axios.get(videoUrl, {
          responseType: 'stream',
          headers: COMMON_HEADERS,
          timeout: 45000,
        });

        archive.append(videoRes.data, { name: fileName });
        await new Promise((r) => setTimeout(r, 800)); // chờ 0.8s giữa các video để tránh bị rate-limit
      } catch (err) {
        console.warn(`⚠️ Video lỗi (${url}): ${err.message}`);
        archive.append(
          `Video lỗi:\n${url}\nChi tiết: ${err.message}\n`,
          { name: `error_${Date.now()}.txt` }
        );
      }
    }

    archive.finalize();
    archive.on('end', () => console.log(`✅ Gửi xong ZIP ${zipName}`));
    archive.on('error', (err) => {
      console.error('❌ Lỗi nén ZIP:', err.message);
      if (!res.headersSent) res.status(500).end('Lỗi nén file ZIP.');
    });
  } catch (err) {
    console.error('❌ Batch error:', err.message);
    res.status(500).json({ ok: false, message: 'Lỗi khi xử lý tải hàng loạt.' });
  }
});

module.exports = router;
