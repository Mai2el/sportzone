# SportZone

Web bán đồ thể thao: có **mục sản phẩm**, **phân trang** (8 sản phẩm/trang), **đăng nhập Google**, **gửi mail**.

## Chạy thử
1. `npm install`
2. `cp .env.example .env` rồi điền giá trị (xem dưới)
3. `npm start` -> mở http://localhost:3000

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
- Các trang còn lại (trang chủ, bộ sưu tập, chi tiết, liên hệ, blog/chính sách và xác thực) hiện vẫn được xử lý trong `server.js`
- `public/style.css`: giao diện
- `users.json`: tự tạo, lưu người dùng đã đăng nhập
