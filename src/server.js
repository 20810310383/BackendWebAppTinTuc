const express = require('express');
const bodyParser = require('body-parser');
const viewEngine = require('./config/viewEngine');
const connectDB = require('./config/connectDB');
const boDe = require('./routes/bodeRouter'); 
const baiviet = require('./routes/baivietRouter'); 
const capHoc = require('./routes/caphocRouter'); 
const monHoc = require('./routes/monhocRouter'); 
const userRoutes = require('./routes/user');
const commentRoutes = require('./routes/comment');
const ketquaRoutes = require('./routes/ketqua');
const uploadRouter = require('./routes/uploadRouter');
const uploadAudio = require('./routes/uploadAudio');
const uploadVideo = require('./routes/uploadVideo');
const wordRouter = require('./routes/word');
const ipLogRouter = require('./routes/ipLogRouter');
const aiSuggestRouter = require('./routes/aiSuggest');
const tiktokRouter = require('./routes/tiktokRouter');
const imageRoutes = require('./routes/imageRoutes');
const shortUrlRoutes  = require('./routes/shortUrlRoutes');
const thongBaoRoutes  = require('./routes/thongBaoRoutes');
const auth_Routes = require('./routes/auth.routes');

const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const moment = require('moment');
const cleanUploads = require('./utils/cleanUploads');

require("dotenv").config();


let app = express();
let port = process.env.PORT || 6969;
const hostname = process.env.HOST_NAME;

connectDB();

// Cài đặt CORS
const allowedOrigins = [
    'http://localhost:3070',     
    'https://dantri24h.com',  
    'http://localhost:3010',     
    'https://ktquiz.com'   
];
const cookieParser = require('cookie-parser');
app.use(cookieParser());


app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) { // Dùng includes thay cho indexOf
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,    
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],  // Cho phép phương thức OPTIONS (preflight)
    allowedHeaders: ['Content-Type', 'Authorization', 'upload-type'],
}));
app.options('*', cors()); // Enable preflight requests for all routes
app.set('trust proxy', true); // BẮT BUỘC nếu dùng nginx hoặc VPS



// Config bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Đặt thư mục public/uploads làm public để có thể truy cập
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// Config app
viewEngine(app);

const routes = [  
    { path: '/api/bo-de', router: boDe },
    { path: '/api/bai-viet', router: baiviet },
    { path: '/api/cap-hoc', router: capHoc },
    { path: '/api/mon-hoc', router: monHoc },
    { path: '/api/user', router: userRoutes },
    { path: '/api/comment', router: commentRoutes },
    { path: '/api/ketqua', router: ketquaRoutes },
    { path: '/api/upload', router: uploadRouter },
    { path: '/api/audio', router: uploadAudio },
    { path: '/api/video', router: uploadVideo },
    { path: '/api/word', router: wordRouter },
    { path: '/api/iplog', router: ipLogRouter },
    { path: '/api/chatgpt', router: aiSuggestRouter },
    { path: '/api/auth', router: auth_Routes },
    { path: '/api/tiktok', router: tiktokRouter },
    { path: '/api/images', router: imageRoutes },
    { path: '/api/url', router: shortUrlRoutes  },
    { path: '/api/thongbao', router: thongBaoRoutes  },
];
  
routes.forEach(route => app.use(route.path, route.router));

// Route public redirect (ngoài API)
app.use("/s", shortUrlRoutes);

// Sử dụng uploadRouter
app.use("/api/upload", uploadRouter); // Đặt đường dẫn cho upload

// Lịch cron: "*/5 * * * *" = 5 phút 1 lần
// cron.schedule("*/5 * * * *", () => {
//   console.log("🧹 Đang dọn thư mục uploads...");
//   cleanUploads();
// });

app.listen(port, () => {
    console.log("backend nodejs is running on the port:", port, `\n http://localhost:${port}`);
});
