# SportZone

Web bán đồ thể thao: có **mục sản phẩm**, **phân trang** (8 sản phẩm/trang), **đăng nhập Google**, **gửi mail**.

## Chạy thử
1. `npm install`
2. `Copy-Item .env.example .env` rồi điền cấu hình trong `.env`
3. `npm start` -> mở http://localhost:3000

## MongoDB Atlas
- Tạo cluster trên MongoDB Atlas, tạo Database User và cho phép IP của máy chạy app trong Network Access.
- Điền connection string Atlas vào `MONGODB_URI` trong `.env`; thay username, password và cluster. Nếu mật khẩu có ký tự đặc biệt, URL-encode phần mật khẩu.
- Đặt `SESSION_SECRET` thành một chuỗi ngẫu nhiên riêng. App không dùng MongoDB local: thiếu URI hoặc lỗi kết nối Atlas thì server sẽ dừng.
- Tài khoản được lưu trong collection `users`; session ID được lưu trong collection `sessions` và gửi về trình duyệt bằng cookie `httpOnly`.
- Đăng ký/đăng nhập: `/register` và `/login`. Có thể tiếp tục dùng Google OAuth nếu đã cấu hình các biến tương ứng.

## Lấy khóa Google OAuth
- Vào Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID (Web application).
- Authorized redirect URI: `http://localhost:3000/auth/google/callback` (khi deploy: đổi theo `BASE_URL`).
- Chép Client ID / Client Secret vào `.env`. Nếu app ở chế độ Testing, thêm email của bạn vào Test users.

## Cấu hình gửi mail (Gmail)
- Bật xác minh 2 bước, tạo **App password** tại myaccount.google.com/apppasswords, điền vào `SMTP_PASS`.
- Mail gửi khi: (1) người dùng đăng nhập Google lần đầu (mail chào mừng), (2) gửi form Liên hệ (mail về `MAIL_TO`).

## Cấu trúc
- `server.js`: khởi tạo Express, middleware và kết nối các module
- `models/productModel.js`: danh mục, dữ liệu mẫu và truy vấn sản phẩm
- `controllers/productController.js`: xử lý danh sách, tìm kiếm, phân trang và API thẻ sản phẩm
- `views/productView.js`: dựng HTML cho danh sách sản phẩm
- `routes/productRoutes.js`: route sản phẩm và API cards
- `models/userModel.js`: tài khoản, mật khẩu hash và Google ID trong MongoDB
- `controllers/authController.js`, `routes/authRoutes.js`, `views/authView.js`: luồng đăng ký/đăng nhập
- Các trang còn lại (trang chủ, bộ sưu tập, chi tiết, liên hệ, blog/chính sách) vẫn được xử lý trong `server.js`
- `public/style.css`: giao diện
