require('dotenv').config();
const fs = require('fs');
const express = require('express'), session = require('express-session');
const passport = require('passport'), { Strategy } = require('passport-google-oauth20');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose'), MongoStore = require('connect-mongo');
const User = require('./models/userModel');
const { CATS, products: PRODUCTS } = require('./models/productModel');
const productModel = require('./models/productModel');
const createProductController = require('./controllers/productController');
const createProductView = require('./views/productView');
const createProductRoutes = require('./routes/productRoutes');
const createAuthController = require('./controllers/authController');
const createAuthRoutes = require('./routes/authRoutes');
const { renderAuthPage } = require('./views/authView');

const app = express(), PER_PAGE = 10, PORT = process.env.PORT || 3000;
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;
const GOOGLE_ON = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (!process.env.MONGODB_URI) {
  console.error('Thiếu MONGODB_URI. Hãy điền connection string MongoDB Atlas trong file .env.');
  process.exit(1);
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET phải có ít nhất 32 ký tự và được cấu hình trong file .env.');
  process.exit(1);
}
const mongoConnection = mongoose.connect(process.env.MONGODB_URI);
const sessionStore = MongoStore.create({
  clientPromise: mongoConnection.then(() => mongoose.connection.getClient()),
  collectionName: 'sessions',
});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => n.toLocaleString('vi-VN') + '₫';
const Q = s => '/products?q=' + encodeURIComponent(s);
// Tìm ảnh trong public/img/<thư mục>/<tên>.(jpg|jpeg|png|webp); không có thì trả về undefined (dùng emoji/gradient thay thế).
const pic = (dir, name) => ['jpg', 'jpeg', 'png', 'webp'].map(e => `/img/${dir}/${name}.${e}`).find(u => fs.existsSync('public' + u));
// Style nền cho ảnh bài viết: có ảnh thì dùng ảnh, không thì dùng gradient.
const nstyle = n => { const im = pic('blog', n.slug); return `--a:${n.c[0]};--b:${n.c[1]}${im ? `;background:url('${im}') center/cover` : ''}`; };

// ---------- Dữ liệu mẫu ----------
const BANNERS = {
  products: { k: 'Bộ sưu tập mới', t: 'Tất cả sản phẩm', g: 'Shop', c: ['#2b2f3a', '#0c1b2e'] },
  contact: { k: 'Chúng tôi luôn sẵn sàng', t: 'Liên hệ', g: 'Chat', c: ['#e8112d', '#7a0a1a'] },
};
const SLIDES = [
  { k: 'Trang phục thi đấu', t: 'Đội tuyển bóng đá', g: 'Việt Nam', b: '/category/doi-tuyen', c: ['#f26a2e', '#b8391b', '#1d0f0c'], j: ['#d62828', '#4aa3df', '#ffffff', '#e11d2e', '#7a1230'] },
  { k: 'Bộ sưu tập mới', t: 'Sân pickleball', g: 'Chất riêng', b: '/category/pickleball', c: ['#2f7de1', '#1b4aa0', '#0c1b2e'], j: ['#ff7a1a', '#ffffff', '#1f5fbf', '#ffd23f', '#0c1b2e'] },
  { k: 'Chạy bền, bước xa', t: 'Giày thể thao', g: 'Nhẹ như mây', b: '/category/giay', c: ['#e63950', '#8f1d33', '#1a0a10'], j: ['#ffffff', '#0c1b2e', '#f5c542', '#ffffff', '#2b2b2b'] },
];
const TRIO = [
  { k: 'Pickleball', t: 'Vợt Solus', b: '/category/pickleball', c: ['#16a085', '#0b4f47'] },
  { k: 'Thoáng nhẹ', t: 'Quần áo', b: '/category/quan-ao', c: ['#1f5fbf', '#0c1b2e'] },
  { k: 'Nhẹ như mây', t: 'Giày Vento', b: Q('vento'), c: ['#e63950', '#8f1d33'] },
];
// Nội dung: chuỗi = đoạn văn, mảng = danh sách gạch đầu dòng, { h } = tiêu đề nhỏ.
const NEWS = [
  { slug: 'chon-vot-pickleball', t: 'Chọn vợt pickleball phù hợp lối chơi', d: '19/10/2026', c: ['#16a085', '#0b4f47'],
    s: 'Trọng lượng, chất liệu mặt vợt và độ dày lõi quyết định cảm giác đánh. Chọn đúng sẽ chơi bền và đỡ chấn thương.',
    body: [
      'Pickleball dễ làm quen, nhưng một cây vợt không hợp tay sẽ khiến bạn nhanh mỏi cổ tay và khó kiểm soát bóng.',
      { h: 'Trọng lượng vợt' },
      ['Vợt nhẹ (dưới 7.5 oz): linh hoạt, phản xạ nhanh, hợp người chơi dồn, đập lưới.', 'Vợt trung bình (7.5 – 8.2 oz): cân bằng giữa lực và kiểm soát, phù hợp đa số người mới.', 'Vợt nặng (trên 8.2 oz): nhiều lực hơn nhưng dễ mỏi tay.'],
      { h: 'Chất liệu mặt vợt' },
      'Mặt carbon cho độ xoáy và kiểm soát tốt hơn, mặt sợi thủy tinh cho lực đánh mạnh và giá mềm hơn.',
      { h: 'Độ dày lõi' },
      'Lõi 16mm cho cảm giác êm, dễ kiểm soát. Lõi 13 – 14mm cho cảm giác đầm, bóng đi nhanh và nhiều lực hơn.',
      'Nếu chưa chắc, hãy bắt đầu với vợt trung bình lõi 16mm rồi điều chỉnh theo lối chơi của mình.'] },
  { slug: 'chon-giay-chay-bo', t: 'Bí quyết chọn giày chạy bộ cho người mới', d: '12/10/2026', c: ['#e63950', '#8f1d33'],
    s: 'Đừng chọn giày chỉ vì đẹp. Hãy xem form chân, độ đệm và quãng đường bạn định chạy.',
    body: [
      'Một đôi giày phù hợp giúp bạn chạy xa hơn, ít đau gối và đau cổ chân hơn.',
      { h: 'Đo chân vào buổi chiều' },
      'Chân hơi nở về cuối ngày, nên thử giày lúc này sẽ sát thực tế nhất. Chừa khoảng một ngón tay giữa mũi chân và đầu giày.',
      { h: 'Chọn độ đệm theo quãng đường' },
      ['Chạy dưới 5 km: đệm vừa, ưu tiên nhẹ.', 'Chạy 5 – 10 km: đệm êm, đế đủ bám.', 'Chạy dài hoặc cân nặng lớn: đệm dày, hỗ trợ gót tốt.'],
      { h: 'Thay giày đúng lúc' },
      'Sau khoảng 500 – 800 km, độ đệm giảm rõ rệt. Nếu thấy mỏi chân bất thường, hãy kiểm tra lại đế giày.'] },
  { slug: 'mac-gi-khi-da-bong', t: 'Mặc gì khi đá bóng ngày nóng?', d: '07/10/2026', c: ['#f26a2e', '#8f2b12'],
    s: 'Vải thoáng, nhanh khô và màu sáng giúp bạn giữ thể lực suốt trận.',
    body: [
      'Trời nóng, cơ thể mất nước rất nhanh. Trang phục đúng sẽ giúp bạn đỡ mệt và tập trung hơn.',
      { h: 'Chọn vải' },
      'Ưu tiên polyester thoáng khí hoặc vải lưới, thấm hút và khô nhanh. Tránh cotton dày vì giữ mồ hôi, nặng và bí.',
      { h: 'Chọn màu' },
      'Màu sáng phản xạ nhiệt tốt hơn màu tối, nhất là khi đá sân ngoài trời buổi trưa.',
      { h: 'Phụ kiện nên có' },
      ['Tất thể thao có đệm gót, thấm mồ hôi.', 'Bó gối hoặc băng cổ chân nếu từng chấn thương.', 'Bình nước riêng, uống từng ngụm nhỏ đều đặn.']] },
  { slug: 'cham-soc-ao-thi-dau', t: 'Chăm sóc áo thi đấu đúng cách', d: '25/09/2026', c: ['#1f5fbf', '#0c1b2e'],
    s: 'Giặt đúng cách giúp áo giữ màu, giữ form và bền hơn nhiều mùa giải.',
    body: [
      'Áo thi đấu thường có lớp in và vải kỹ thuật nên cần được chăm sóc nhẹ nhàng hơn áo thường.',
      ['Lộn trái áo trước khi giặt để bảo vệ lớp in.', 'Giặt nước lạnh hoặc nước ấm dưới 30°C, chế độ nhẹ.', 'Không dùng thuốc tẩy và hạn chế nước xả vải vì làm giảm khả năng thấm hút.', 'Phơi nơi thoáng mát, tránh nắng gắt; không sấy nhiệt cao.', 'Không ủi trực tiếp lên phần in hoặc logo.'],
      'Giặt ngay sau trận nếu có thể. Để áo ướt lâu trong túi sẽ gây mùi khó chịu và ố vải.'] },
];

const POLICIES = {
  'mua-hang': { title: 'Chính sách mua hàng', sec: [
    { h: 'Cách đặt hàng' },
    'Bạn có thể xem sản phẩm trên website, sau đó liên hệ SportZone qua trang Liên hệ hoặc hotline 1800 0000 để được tư vấn size và chốt đơn.',
    { h: 'Giá và thanh toán' },
    ['Giá niêm yết đã bao gồm thuế VAT.', 'Thanh toán khi nhận hàng (COD) tại nhà.', 'Có thể thanh toán chuyển khoản theo hướng dẫn của nhân viên.'],
    { h: 'Vận chuyển' },
    ['Giao hàng toàn quốc qua đơn vị vận chuyển đối tác.', 'Nội thành: 1 – 2 ngày làm việc. Tỉnh thành khác: 2 – 5 ngày làm việc.', 'Bạn được kiểm tra hàng trước khi thanh toán.'],
    { h: 'Xác nhận đơn hàng' },
    'Sau khi đặt, nhân viên sẽ liên hệ xác nhận thông tin, tình trạng hàng và thời gian giao dự kiến.'] },
  'doi-tra': { title: 'Chính sách đổi trả', sec: [
    { h: 'Thời gian đổi trả' },
    'Trong vòng 7 ngày kể từ ngày nhận hàng.',
    { h: 'Điều kiện áp dụng' },
    ['Sản phẩm còn nguyên tem, mác, chưa giặt, chưa qua sử dụng.', 'Còn đầy đủ hộp, phụ kiện và hóa đơn hoặc thông tin đơn hàng.', 'Sản phẩm bị lỗi do nhà sản xuất hoặc giao sai mẫu, sai size.'],
    { h: 'Trường hợp không áp dụng' },
    ['Sản phẩm đã qua sử dụng, giặt hoặc có dấu hiệu hư hỏng do người dùng.', 'Sản phẩm giảm giá đặc biệt hoặc thanh lý (nếu có ghi chú rõ khi bán).'],
    { h: 'Quy trình' },
    ['Liên hệ SportZone qua hotline hoặc email info@sportzone.vn, nêu mã đơn và lý do.', 'Gửi lại sản phẩm theo hướng dẫn.', 'Chúng tôi kiểm tra và đổi sản phẩm mới hoặc hoàn tiền trong 3 – 5 ngày làm việc.'],
    'Với lỗi từ phía SportZone, chúng tôi chịu phí vận chuyển hai chiều.'] },
  'bao-hanh': { title: 'Chính sách bảo hành', sec: [
    { h: 'Phạm vi bảo hành' },
    ['Giày: bảo hành 3 tháng với lỗi bong keo, đứt chỉ, hở đế.', 'Vợt pickleball: bảo hành 6 tháng với lỗi bong tách mặt vợt, nứt lõi do sản xuất.', 'Quần áo và trang phục: hỗ trợ xử lý lỗi đường may, khóa kéo trong 30 ngày.'],
    { h: 'Không thuộc phạm vi bảo hành' },
    ['Hao mòn tự nhiên khi sử dụng.', 'Hư hỏng do va đập mạnh, dùng sai mục đích hoặc bảo quản không đúng cách.', 'Sản phẩm đã bị tự ý sửa chữa.'],
    { h: 'Cách yêu cầu bảo hành' },
    'Liên hệ SportZone kèm hình ảnh sản phẩm lỗi và thông tin đơn hàng. Thời gian xử lý thông thường từ 5 – 10 ngày làm việc tùy mức độ lỗi.'] },
  'bao-mat': { title: 'Chính sách bảo mật', sec: [
    { h: 'Thông tin chúng tôi thu thập' },
    ['Họ tên, email và nội dung bạn gửi qua form liên hệ.', 'Email bạn đăng ký nhận ưu đãi.', 'Tên, email và ảnh đại diện khi bạn đăng nhập bằng Google.'],
    { h: 'Mục đích sử dụng' },
    ['Phản hồi yêu cầu và hỗ trợ đơn hàng.', 'Gửi thông tin ưu đãi nếu bạn đã đăng ký.', 'Cải thiện trải nghiệm sử dụng website.'],
    { h: 'Chia sẻ thông tin' },
    'SportZone không bán hoặc trao đổi thông tin cá nhân của bạn cho bên thứ ba. Thông tin chỉ được chia sẻ với đơn vị vận chuyển khi cần giao hàng, hoặc khi pháp luật yêu cầu.',
    { h: 'Bảo mật và quyền của bạn' },
    'Chúng tôi áp dụng các biện pháp hợp lý để bảo vệ dữ liệu. Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân bằng cách gửi email tới info@sportzone.vn.'] },
};
const MENU = [
  { t: 'Đồ nam', h: '/collection/nam', g: [
    { t: 'Giày', h: '/category/giay', i: [['Giày đá bóng', Q('đá bóng')], ['Giày pickleball', Q('pickleball')], ['Giày chạy bộ', Q('chạy bộ')]] },
    { t: 'Quần áo', h: '/category/quan-ao', i: [['Áo polo', Q('polo')], ['Áo phông', Q('phông')], ['Quần short', Q('short')]] }] },
  { t: 'Đồ nữ', h: '/collection/nu', g: [
    { t: 'Giày', h: '/category/giay', i: [['Giày chạy bộ', Q('chạy bộ')], ['Giày thể thao', Q('thể thao')], ['Giày pickleball', Q('pickleball')]] },
    { t: 'Quần áo', h: '/category/quan-ao', i: [['Áo polo', Q('polo')], ['Váy thể thao', Q('váy')]] }] },
  { t: 'Môn thể thao', h: '/collection/mon-the-thao', g: [
    { t: 'Bóng đá', h: '/category/doi-tuyen', i: [['Trang phục', '/category/doi-tuyen'], ['Giày', Q('đá bóng')]] },
    { t: 'Pickleball', h: '/category/pickleball', i: [['Vợt', Q('vợt')], ['Giày', Q('pickleball')], ['Phụ kiện', Q('túi')]] }] },
  { t: 'Đội tuyển', h: '/category/doi-tuyen' },
  { t: 'Blog', h: '/blog' },
];

// ---------- Gửi mail ----------
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: process.env.SMTP_PORT == 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const sendMail = o => mailer.sendMail({ from: `"SportZone" <${process.env.SMTP_USER}>`, ...o });

// ---------- Đăng nhập Google ----------
if (GOOGLE_ON) {
  passport.use(new Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: BASE + '/auth/google/callback',
  }, async (at, rt, profile, done) => {
    try {
      const { user, created } = await User.findOrCreateGoogle(profile);
      if (created && user.email) sendMail({ to: user.email, subject: 'Chào mừng đến SportZone', html: `<p>Xin chào ${esc(user.name)}, cảm ơn bạn đã đăng ký tại SportZone!</p>` })
        .catch(error => console.error('Gửi mail chào mừng lỗi:', error.message));
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
} else {
  console.warn('Chưa có GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trong .env: đăng nhập Google đang tắt.');
}
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(user => done(null, user || false)).catch(done));

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({
  name: 'sportzone.sid',
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ---------- Giao diện ----------
const IC = {
  bag: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14l-1 13H6zM9 8a3 3 0 016 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
};

const menuHtml = `<ul class="menu">${MENU.map(m => `<li><a href="${m.h}">${m.t}</a>${m.g ? `<div class="mega">${m.g.map(g =>
  `<div><a class="mh" href="${g.h}">${g.t}</a>${g.i.map(i => `<a href="${i[1]}">${i[0]}</a>`).join('')}</div>`).join('')}</div>` : ''}</li>`).join('')}</ul>`;

const layout = (req, title, body, full) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} - SportZone</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"></head><body>
<div class="topbar"><div class="tl"><span>Hỗ trợ 24/7</span><span>Vận chuyển toàn quốc</span><span>Thanh toán tại nhà</span></div>
<div class="tr"><span>Hotline: 1800 0000</span>${req.user
    ? `${req.user.avatar ? `<img class="ava" src="${esc(req.user.avatar)}" alt="">` : esc(req.user.name)}<form method="post" action="/logout"><button class="out">Đăng xuất</button></form>`
    : `<a href="/login">Đăng nhập</a><a href="/register">Đăng ký</a>`}</div></div>
<header><a class="logo" href="/">SPORTZONE</a>
<nav>${menuHtml}</nav>
<form class="search" action="/products"><input name="q" placeholder="Tìm kiếm sản phẩm" aria-label="Tìm kiếm" value="${esc(req.query.q)}"><button aria-label="Tìm">${IC.search}</button></form>
<a class="bag" href="/contact" title="Giỏ hàng (sắp có)">${IC.bag}<i>0</i></a></header>
${full ? body : `<main>${body}</main>`}
<a class="msg" href="/contact" title="Nhắn cho chúng tôi" aria-label="Nhắn cho chúng tôi">💬</a>
<footer><div class="fcols">
<div><b>SPORTZONE</b><p>Đồ thể thao chính hãng, giao toàn quốc, thanh toán tại nhà.</p><span>Mail: info@sportzone.vn</span></div>
<div><b>Hướng dẫn</b>${Object.entries(POLICIES).map(([s, p]) => `<a href="/policy/${s}">${p.title}</a>`).join('')}</div>
<div><b>Danh mục</b>${CATS.map(c => `<a href="/category/${c.slug}">${c.name}</a>`).join('')}</div>
<div><b>Nhận hot deal</b><form class="fsub" method="post" action="/subscribe"><input type="email" name="email" placeholder="Email của bạn" required maxlength="120" aria-label="Email"><button>Đăng ký</button></form></div>
</div><small>© 2026 SportZone</small></footer>
<script>document.querySelectorAll('.row').forEach(r=>{const ts=[...r.querySelectorAll('.tabs button')],ps=[...r.querySelectorAll('.panel')],bs=[...r.querySelectorAll('.arr button')];const tr=()=>[...r.querySelectorAll('.track')].find(x=>x.offsetParent);const upd=()=>{const t=tr();if(!t||bs.length<2)return;bs[0].disabled=t.scrollLeft<4;bs[1].disabled=t.scrollLeft+t.clientWidth>=t.scrollWidth-4};ts.forEach((b,i)=>b.onclick=()=>{ts.forEach(x=>x.classList.toggle('on',x===b));ps.forEach((p,j)=>p.hidden=j!==i);upd()});bs.forEach(b=>b.onclick=()=>{const t=tr();if(t)t.scrollBy({left:+b.dataset.d*t.clientWidth*.9,behavior:'smooth'})});r.addEventListener('scroll',upd,true);addEventListener('resize',upd);upd()})</script>
<script>try{const c=JSON.parse(localStorage.sz_cart||'[]'),i=document.querySelector('.bag i');if(i)i.textContent=c.reduce((a,x)=>a+x.q,0)}catch(e){}</script>
</body></html>`;

const authController = createAuthController({ User, authView: { renderAuthPage: (req, mode) => renderAuthPage(layout, req, mode) } });
app.use(createAuthRoutes(authController));

const banner = b => `<div class="pbanner" style="--a:${b.c[0]};--b:${b.c[1]}"><span class="ghost" aria-hidden="true">${esc(b.g || b.name)}</span><div><p>${esc(b.k)}</p><h1>${esc(b.t || b.name)}</h1></div></div>`;
const page = (req, title, b, inner) => layout(req, title, banner(b) + `<main>${inner}</main>`, true);

const price = p => `<strong>${money(Math.round(p.price * (100 - p.sale) / 100))}</strong>${p.sale ? `<s>${money(p.price)}</s>` : ''}`;
// Ảnh sản phẩm: p.img, hoặc public/img/products/<id>.jpg, hoặc public/img/products/<danh-mục>-<1..4>.jpg (dùng chung cho các bản v2, v3).
const thumb = p => { const im = p.img || pic('products', p.id) || pic('products', p.base); return im ? `<img src="${esc(im)}" alt="${esc(p.name)}" loading="lazy">` : CATS.find(c => c.slug === p.cat).icon; };
const card = p => `<a class="card${p.out ? ' out-of-stock' : ''}" href="/product/${p.id}"><div class="img">${thumb(p)}${p.sale ? `<span class="tag">-${p.sale}%</span>` : ''}${p.out ? '<span class="sold">Hết hàng</span>' : ''}<span class="view">Xem chi tiết</span></div>
<h3>${esc(p.name)}</h3><p>${price(p)}</p></a>`;
const track = items => `<div class="track">${items.map(card).join('')}</div>`;
const arrows = `<button type="button" aria-label="Trước" data-d="-1"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><button type="button" aria-label="Sau" data-d="1"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`;

// ---------- Banner lớn (dùng cho trang chủ và các trang bộ sưu tập) ----------
// Ảnh nền tùy chọn: đặt public/img/banners/<prefix>-<số thứ tự>.jpg (vd home-1.jpg, nam-2.jpg)
const jerseys = j => j.map(c => `<svg class="jersey" viewBox="0 0 100 110"><use href="#j" fill="${c}" stroke="rgba(0,0,0,.25)"/></svg>`).join('');
const hero = (slides, prefix) => {
  const body = slides.map((s, i) => {
    const im = s.img || pic('banners', `${prefix}-${i + 1}`);
    return `<section class="slide${i ? '' : ' on'}${im ? ' photo' : ''}" style="--a:${s.c[0]};--b:${s.c[1]};--c:${s.c[2]}${im ? `;--img:url('${esc(im)}')` : ''}">
<div class="copy"><p>${s.k}</p><h2>${s.t}<span>${s.g}</span></h2><a class="cta" href="${s.b}">Xem ngay</a></div>${im ? '' : `<div class="squad">${jerseys(s.j)}</div>`}</section>`;
  }).join('');
  return `<svg width="0" height="0" style="position:absolute"><symbol id="j" viewBox="0 0 100 110"><path d="M30 8 10 20 2 48l16 6 4-14v64h56V40l4 14 16-6-8-28L70 8Q50 26 30 8Z"/></symbol></svg>
<div class="hero">${body}${slides.length > 1 ? `<div class="dots">${slides.map((_, i) => `<button class="${i ? '' : 'on'}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>` : ''}</div>
<script>(()=>{const s=[...document.querySelectorAll('.slide')],d=[...document.querySelectorAll('.dots button')];if(s.length<2)return;let i=0;const go=n=>{s[i].classList.remove('on');d[i].classList.remove('on');i=(n+s.length)%s.length;s[i].classList.add('on');d[i].classList.add('on')};d.forEach((b,n)=>b.onclick=()=>go(n));if(!matchMedia('(prefers-reduced-motion:reduce)').matches)setInterval(()=>go(i+1),5500)})()</script>`;
};

// ---------- Trang chủ ----------
function home(req, res) {
  const msg = { 1: 'Đã đăng ký. Cảm ơn bạn!', 0: 'Email chưa hợp lệ hoặc chưa gửi được, thử lại nhé.' }[req.query.sub] || 'Đặt hàng ngay hôm nay để nhận ƯU ĐÃI!';

  // Khối "Sản phẩm mới" có tab theo danh mục
  const newest = `<section class="row"><div class="head"><h2>SẢN PHẨM MỚI</h2><div class="arr"><a href="/products">Xem tất cả</a>${arrows}</div></div>
<div class="tabs">${CATS.map((c, i) => `<button class="${i ? '' : 'on'}">${c.name}</button>`).join('')}</div>
${CATS.map((c, i) => `<div class="panel"${i ? ' hidden' : ''}>${track(PRODUCTS.filter(p => p.cat === c.slug && !p.out).slice(0, 8))}</div>`).join('')}</section>`;

  const rows = CATS.map(c => `<section class="row"><div class="head"><h2>${c.name.toUpperCase()}</h2><div class="arr"><a href="/category/${c.slug}">Xem tất cả</a>${arrows}</div></div>
${track(PRODUCTS.filter(p => p.cat === c.slug))}</section>`);

  const trio = `<section class="trio">${TRIO.map(t => `<a href="${t.b}" style="--a:${t.c[0]};--b:${t.c[1]}"><small>${t.k}</small><b>${t.t}</b><span>Xem ngay</span></a>`).join('')}</section>`;
  const about = `<section class="about"><div><h2>SPORTZONE – ĐỒ THỂ THAO CHO MỌI TRẬN ĐẤU</h2>
<p>Chúng tôi chọn lọc sản phẩm thể thao chất lượng, phù hợp dáng vóc và thói quen tập luyện của người Việt: từ giày, quần áo đến vợt pickleball và trang phục đội tuyển.</p><a class="cta" href="/contact">Liên hệ</a></div><div class="aimg" aria-hidden="true">🏅</div></section>`;
  const news = `<section class="row" id="news"><div class="head"><h2>TIN TỨC MỚI NHẤT</h2><div class="arr"><a href="/blog">Xem tất cả</a></div></div><div class="news">${NEWS.map(n =>
    `<a class="nw" href="/blog/${n.slug}"><div class="nimg" style="${nstyle(n)}"></div><small>Đăng lúc: ${n.d}</small><h3>${esc(n.t)}</h3><span>Đọc tiếp</span></a>`).join('')}</div></section>`;

  res.send(layout(req, 'Trang chủ', `${hero(SLIDES, 'home')}
<form class="promo" method="post" action="/subscribe"><b>${msg}</b><div><input type="email" name="email" placeholder="Nhập email" required maxlength="120" aria-label="Email"><button>Đăng ký ngay</button></div></form>
<main>${newest}${rows[0]}${rows[1]}${trio}${rows[2]}${rows[3]}${about}${news}</main>`, true));
}

app.get('/', home);
const productView = createProductView({ layout, page, card, productBanner: BANNERS.products });
const productController = createProductController({ model: productModel, view: productView, perPage: PER_PAGE });
app.use(createProductRoutes(productController));

// ---------- Trang bộ sưu tập (Đồ nam / Đồ nữ / Môn thể thao) có banner lớn ----------
const COLLECTIONS = {
  nam: { name: 'Đồ nam', cats: ['giay', 'quan-ao'], skip: /váy/i, slides: [
    { k: 'Bộ sưu tập nam', t: 'Đồ nam', g: 'Mạnh mẽ', b: '/category/quan-ao', c: ['#1f5fbf', '#123a7a', '#0c1b2e'], j: ['#0c1b2e', '#ffffff', '#1f5fbf', '#f5c542', '#2b2b2b'] },
    { k: 'Chạy bền, bước xa', t: 'Giày nam', g: 'Vững bước', b: '/category/giay', c: ['#e63950', '#8f1d33', '#1a0a10'], j: ['#ffffff', '#0c1b2e', '#e63950', '#ffffff', '#2b2b2b'] }] },
  nu: { name: 'Đồ nữ', cats: ['giay', 'quan-ao'], slides: [
    { k: 'Bộ sưu tập nữ', t: 'Đồ nữ', g: 'Năng động', b: '/category/quan-ao', c: ['#e0508f', '#8f1d5a', '#2a0a1d'], j: ['#ffffff', '#f7a8c9', '#e0508f', '#ffd23f', '#2b2b2b'] },
    { k: 'Thoáng nhẹ', t: 'Váy thể thao', g: 'Serena', b: Q('váy'), c: ['#8e5bd6', '#4b2a8a', '#150a2e'], j: ['#ffffff', '#c9a8f7', '#8e5bd6', '#f5c542', '#2b2b2b'] }] },
  'mon-the-thao': { name: 'Môn thể thao', cats: ['doi-tuyen', 'pickleball'], slides: [
    { k: 'Trang phục thi đấu', t: 'Bóng đá', g: 'Hết mình', b: '/category/doi-tuyen', c: ['#f26a2e', '#b8391b', '#1d0f0c'], j: ['#d62828', '#4aa3df', '#ffffff', '#e11d2e', '#7a1230'] },
    { k: 'Bộ sưu tập mới', t: 'Pickleball', g: 'Chất riêng', b: '/category/pickleball', c: ['#16a085', '#0b4f47', '#04201d'], j: ['#ff7a1a', '#ffffff', '#16a085', '#ffd23f', '#0c1b2e'] }] },
};
app.get('/collection/:slug', (req, res) => {
  const col = COLLECTIONS[req.params.slug];
  if (!col) return res.status(404).send(layout(req, 'Không tìm thấy', '<div class="head"><h2>Không có mục này</h2></div><p><a href="/">Về trang chủ</a></p>'));
  const rows = col.cats.map(slug => {
    const cat = CATS.find(c => c.slug === slug);
    const items = PRODUCTS.filter(p => p.cat === slug && !(col.skip && col.skip.test(p.name)));
    return `<section class="row"><div class="head"><h2>${cat.name.toUpperCase()}</h2><div class="arr"><a href="/category/${slug}">Xem tất cả</a>${arrows}</div></div>${track(items)}</section>`;
  }).join('');
  res.send(layout(req, col.name, `${hero(col.slides, req.params.slug)}<main>${rows}</main>`, true));
});

// ---------- Chi tiết sản phẩm ----------
// Dữ liệu mẫu cho phần biến thể. Có thể ghi đè từng sản phẩm bằng các trường: p.imgs (mảng ảnh), p.colors ([['Tên', '#hex'], ...]),
// p.sizes (mảng), p.desc (mảng đoạn văn), p.highlights (mảng gạch đầu dòng), p.material, p.sku.
const APPAREL = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const SWATCH = [['Đen', '#111'], ['Trắng', '#f4f4f4'], ['Navy', '#1b2a4a'], ['Đỏ', '#e8112d'], ['Xanh lá', '#2e9e5b'], ['Hồng', '#f08fb0'], ['Xám', '#8a8d93']];
const SIZES = { giay: ['38', '39', '40', '41', '42', '43', '44'], 'quan-ao': APPAREL, 'doi-tuyen': APPAREL, pickleball: [] };
const SIZE_CHART = {
  giay: { head: ['Size (EU)', 'Chiều dài chân (cm)'], rows: [['38', '23.5'], ['39', '24.0'], ['40', '25.0'], ['41', '25.5'], ['42', '26.5'], ['43', '27.0'], ['44', '27.5']] },
  apparel: { head: ['Size', 'Chiều cao (cm)', 'Cân nặng (kg)'], rows: [['S', '160–165', '52–58'], ['M', '165–170', '58–65'], ['L', '170–175', '65–72'], ['XL', '175–180', '72–80'], ['2XL', '180–185', '80–88'], ['3XL', '185–190', '88–95']] },
};
const INFO = {
  giay: { mat: 'Thân lưới thoáng khí, đế EVA',
    desc: ['Đôi giày cân bằng giữa độ nhẹ và độ êm, phù hợp cả luyện tập hằng ngày lẫn thi đấu.'],
    hl: ['Thân giày lưới dệt thoáng khí, hạn chế bí nóng khi vận động dài.', 'Đế giữa EVA đàn hồi, êm chân ở từng bước.', 'Đế ngoài cao su có rãnh bám, vững trên nhiều bề mặt.'] },
  'quan-ao': { mat: '92% polyester, 8% spandex',
    desc: ['Thiết kế thể thao gọn gàng, dễ mặc từ sân tập đến đi chơi.', 'Vải mềm mịn, thoát ẩm nhanh và co giãn đa chiều nên không gò bó khi vận động.'],
    hl: ['Thoát ẩm nhanh, khô thoáng.', 'Co giãn đa chiều, đứng form.', 'Giữ màu tốt sau nhiều lần giặt.'] },
  pickleball: { mat: 'Sợi carbon, lõi polymer',
    desc: ['Thiết bị pickleball cho người mới lẫn người chơi lâu năm, tối ưu cảm giác bóng và khả năng kiểm soát.'],
    hl: ['Bề mặt tạo xoáy tốt.', 'Cân bằng giữa lực đánh và kiểm soát.', 'Bền, ít chấn động truyền lên tay.'] },
  'doi-tuyen': { mat: '100% polyester',
    desc: ['Trang phục lấy cảm hứng từ đội tuyển, đủ nhẹ để thi đấu và đủ đẹp để mặc ra đường cổ vũ.'],
    hl: ['Vải nhẹ, thoát mồ hôi nhanh.', 'Họa tiết và logo in sắc nét, bền màu.', 'Phom thoải mái cho cả mặc thi đấu lẫn mặc hằng ngày.'] },
};
const TINT = ['#f4f4f5', '#fdecef', '#e9f1ff', '#eaf7ee'];
const sku = p => p.sku || 'SZ-' + p.cat.slice(0, 2).toUpperCase() + String(p.id).padStart(4, '0');
const colorsOf = p => p.colors || Array.from({ length: 2 + (p.id % 2) }, (_, i) => SWATCH[(p.id + i * 2) % SWATCH.length]);
// Ảnh: p.imgs, hoặc public/img/products/<id>-1..6.jpg, hoặc ảnh đơn như ở thẻ sản phẩm. Không có ảnh thì dùng emoji giữ chỗ.
const slidesOf = p => {
  const first = p.img || pic('products', p.id) || pic('products', p.base);
  const extra = [1, 2, 3, 4, 5, 6].map(n => pic('products', `${p.id}-${n}`)).filter(Boolean);
  const imgs = p.imgs || (extra.length ? extra : first ? [first] : []);
  return imgs.length ? imgs.map(u => ({ html: `<img src="${esc(u)}" alt="${esc(p.name)}">`, bg: '' }))
    : TINT.map(t => ({ html: `<span>${CATS.find(c => c.slug === p.cat).icon}</span>`, bg: t }));
};
const chart = t => `<table class="spec"><thead><tr>${t.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

app.get('/product/:id', (req, res) => {
  const p = PRODUCTS.find(x => x.id == req.params.id);
  if (!p) return res.status(404).send(layout(req, 'Không tìm thấy', '<div class="head"><h2>Không có sản phẩm này</h2></div><p><a href="/products">Xem tất cả sản phẩm</a></p>'));
  const c = CATS.find(x => x.slug === p.cat), info = INFO[p.cat];
  const colors = colorsOf(p), sizes = p.sizes || SIZES[p.cat] || [], slides = slidesOf(p), multi = slides.length > 1;
  const chartKey = p.cat === 'giay' ? 'giay' : sizes.length ? 'apparel' : null;
  const related = [...PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id), ...PRODUCTS.filter(x => x.cat !== p.cat)].slice(0, 8);
  const off = p.out ? ' disabled' : '';

  const gallery = `<div class="gallery${multi ? '' : ' single'}">
${multi ? `<div class="thumbs">${slides.map((s, i) => `<button type="button" class="${i ? '' : 'on'}" aria-label="Xem ảnh ${i + 1}"${s.bg ? ` style="background:${s.bg}"` : ''}>${s.html}</button>`).join('')}</div>` : ''}
<div class="stage">${slides.map((s, i) => `<div class="sl${i ? '' : ' on'}"${s.bg ? ` style="background:${s.bg}"` : ''}>${s.html}</div>`).join('')}
${p.sale ? `<span class="tag">-${p.sale}%</span>` : ''}${p.out ? '<span class="sold">Hết hàng</span>' : ''}
${multi ? '<button type="button" class="go prev" data-s="-1" aria-label="Ảnh trước">‹</button><button type="button" class="go next" data-s="1" aria-label="Ảnh sau">›</button>' : ''}</div></div>`;

  const colorOpt = `<fieldset class="opt"><legend>Màu sắc: <b id="cn">${esc(colors[0][0])}</b></legend><div class="chips">${colors.map((k, i) =>
    `<label><input type="radio" name="color" value="${esc(k[0])}"${i ? '' : ' checked'}><span><i style="--c:${k[1]}"></i>${esc(k[0])}</span></label>`).join('')}</div></fieldset>`;
  const sizeOpt = sizes.length ? `<fieldset class="opt" id="szset"><legend>Kích thước: <b id="sn">Chưa chọn</b></legend><div class="chips">${sizes.map(s =>
    `<label><input type="radio" name="size" value="${esc(s)}"><span>${esc(s)}</span></label>`).join('')}</div>
<p class="err" id="szerr" role="alert" hidden>Vui lòng chọn kích thước.</p>${chartKey ? '<button type="button" class="link" id="szbtn">Hướng dẫn chọn size</button>' : ''}</fieldset>` : '';

  const specs = [['Thương hiệu', 'SPORTZONE'], ['Danh mục', c.name], ['Mã SP', sku(p)], ['Chất liệu', p.material || info.mat], ['Màu', colors.map(k => k[0]).join(', ')]].concat(sizes.length ? [['Kích thước', sizes.join(', ')]] : []);

  res.send(page(req, p.name, c, `<div class="crumb"><a href="/">Trang chủ</a> / <a href="/category/${c.slug}">${c.name}</a> / <span>${esc(p.name)}</span></div>
<div class="detail">${gallery}
<div class="info" data-id="${p.id}" data-name="${esc(p.name)}"><h2>${esc(p.name)}</h2>
<div class="pmeta"><span>Thương hiệu: <b>SPORTZONE</b></span><span>Mã SP: <b>${sku(p)}</b></span><span class="stock ${p.out ? 'no' : 'yes'}">Tình trạng: <b>${p.out ? 'Hết hàng' : 'Còn hàng'}</b></span></div>
<p class="pr">${price(p)}${p.sale ? `<em class="off">-${p.sale}%</em>` : ''}</p>
${colorOpt}${sizeOpt}
<div class="buy"><div class="qty"><button type="button" data-q="-1" aria-label="Giảm"${off}>−</button><input id="qty" value="1" inputmode="numeric" aria-label="Số lượng"${off}><button type="button" data-q="1" aria-label="Tăng"${off}>+</button></div>
<button type="button" class="btn-add" id="add"${off}>Thêm vào giỏ</button><button type="button" class="cta" id="now"${off}>${p.out ? 'Hết hàng' : 'Mua ngay'}</button></div>
<ul class="perks"><li>Hàng chính hãng, giao toàn quốc, thanh toán tại nhà.</li><li>Xem <a href="/policy/doi-tra">chính sách đổi trả</a> và <a href="/policy/bao-hanh">bảo hành</a>.</li><li>Cần tư vấn size, màu? <a href="/contact">Nhắn cho chúng tôi</a>.</li></ul></div></div>

<section class="ptabs"><div class="bar" role="tablist"><button type="button" role="tab" class="on">Thông tin chi tiết</button><button type="button" role="tab">Thông số</button></div>
<div class="panel prose"><h3>${esc(p.name)}</h3>${(p.desc || info.desc).map(t => `<p>${esc(t)}</p>`).join('')}<h3>Đặc điểm nổi bật</h3><ul>${(p.highlights || info.hl).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
<p>Mọi thông tin về đổi trả, bảo hành vui lòng xem <a href="/policy/doi-tra">Chính sách đổi trả</a> │ <a href="/policy/bao-hanh">Chính sách bảo hành</a>.</p></div>
<div class="panel" hidden><table class="spec"><tbody>${specs.map(r => `<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div></section>

<section class="row"><div class="head"><h2>SẢN PHẨM BẠN QUAN TÂM</h2><div class="arr">${arrows}</div></div>${track(related)}</section>
<section class="row" id="rv" hidden><div class="head"><h2>SẢN PHẨM ĐÃ XEM</h2><div class="arr">${arrows}</div></div><div class="track"></div></section>
${chartKey ? `<dialog id="szdlg" aria-label="Bảng size"><h3>Bảng size</h3>${chart(SIZE_CHART[chartKey])}<p class="note">Số đo mang tính tham khảo. Nếu phân vân giữa hai size, nên chọn size lớn hơn.</p><button type="button" id="szclose">Đóng</button></dialog>` : ''}
<script>(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],info=$('.info'),id=+info.dataset.id;
const sl=$$('.sl'),th=$$('.thumbs button');let cur=0;
const show=n=>{cur=(n+sl.length)%sl.length;sl.forEach((s,i)=>s.classList.toggle('on',i===cur));th.forEach((t,i)=>t.classList.toggle('on',i===cur))};
th.forEach((t,i)=>t.onclick=()=>show(i));$$('.stage .go').forEach(b=>b.onclick=()=>show(cur+ +b.dataset.s));
$$('input[name=color]').forEach(r=>r.onchange=()=>$('#cn').textContent=r.value);
$$('input[name=size]').forEach(r=>r.onchange=()=>{$('#sn').textContent=r.value;$('#szerr').hidden=true});
const q=$('#qty'),setQ=v=>q.value=Math.min(99,Math.max(1,parseInt(v)||1));
$$('[data-q]').forEach(b=>b.onclick=()=>setQ(+q.value+ +b.dataset.q));q.onchange=()=>setQ(q.value);
const tb=$$('.ptabs .bar button'),tp=$$('.ptabs .panel');
tb.forEach((b,i)=>b.onclick=()=>{tb.forEach(x=>x.classList.toggle('on',x===b));tp.forEach((p,j)=>p.hidden=j!==i)});
const d=$('#szdlg');if(d){$('#szbtn').onclick=()=>d.showModal();$('#szclose').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()}}
const toast=m=>{const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)};
const pick=()=>{const s=$('input[name=size]:checked');if($('#szset')&&!s){$('#szerr').hidden=false;$('#szset').scrollIntoView({block:'center',behavior:'smooth'});return null}return{id:id,c:$('input[name=color]:checked').value,s:s?s.value:'',q:+q.value||1}};
const add=o=>{let c=[];try{c=JSON.parse(localStorage.sz_cart||'[]')}catch(e){}const k=c.find(x=>x.id===o.id&&x.c===o.c&&x.s===o.s);k?k.q+=o.q:c.push(o);try{localStorage.sz_cart=JSON.stringify(c)}catch(e){}$('.bag i').textContent=c.reduce((a,x)=>a+x.q,0)};
$('#add').onclick=()=>{const o=pick();if(o){add(o);toast('Đã thêm '+o.q+' sản phẩm vào giỏ')}};
$('#now').onclick=()=>{const o=pick();if(o){add(o);location.href='/contact'}};
let rv=[];try{rv=JSON.parse(localStorage.sz_rv||'[]')}catch(e){}
const others=rv.filter(i=>i!==id).slice(0,8);
if(others.length)fetch('/api/cards?ids='+others.join(',')).then(r=>r.text()).then(h=>{$('#rv .track').innerHTML=h;$('#rv').hidden=false;$('#rv .track').dispatchEvent(new Event('scroll'))}).catch(()=>{});
try{localStorage.sz_rv=JSON.stringify([id].concat(rv.filter(i=>i!==id)).slice(0,12))}catch(e){}
})()</script>`));
});
// ---------- Đăng ký nhận ưu đãi ----------
app.post('/subscribe', async (req, res) => {
  const e = String(req.body.email || '');
  if (!/^\S+@\S+\.\S+$/.test(e)) return res.redirect('/?sub=0');
  try {
    await sendMail({ to: process.env.MAIL_TO || process.env.SMTP_USER, subject: 'Đăng ký nhận ưu đãi', text: e });
    res.redirect('/?sub=1');
  } catch (x) { console.error('Gửi mail lỗi:', x.message); res.redirect('/?sub=0'); }
});

// ---------- Liên hệ -> gửi mail ----------
app.get('/contact', (req, res) => res.send(page(req, 'Liên hệ', BANNERS.contact, `<div class="head"><h2>Gửi tin nhắn cho chúng tôi</h2></div>
${req.query.ok ? '<p class="ok">Đã gửi. Chúng tôi sẽ phản hồi qua email của bạn.</p>' : ''}${req.query.err ? '<p class="err">Chưa gửi được. Kiểm tra thông tin và thử lại.</p>' : ''}
<form method="post" class="contact"><input name="name" placeholder="Họ tên" value="${esc(req.user?.name)}" required maxlength="80">
<input type="email" name="email" placeholder="Email" value="${esc(req.user?.email)}" required maxlength="120">
<textarea name="msg" rows="5" placeholder="Nội dung" required maxlength="2000"></textarea><button>Gửi tin nhắn</button></form>`)));

app.post('/contact', async (req, res) => {
  const { name, email, msg } = req.body;
  if (!name || !msg || !/^\S+@\S+\.\S+$/.test(email || '')) return res.redirect('/contact?err=1');
  try {
    await sendMail({ to: process.env.MAIL_TO || process.env.SMTP_USER, replyTo: email,
      subject: 'Liên hệ từ ' + String(name).slice(0, 80).replace(/[\r\n]/g, ' '), text: `${name} <${email}>\n\n${msg}` });
    res.redirect('/contact?ok=1');
  } catch (e) { console.error('Gửi mail lỗi:', e.message); res.redirect('/contact?err=1'); }
});

// ---------- Chính sách + Blog ----------
const renderBody = b => b.map(x => typeof x === 'string' ? `<p>${esc(x)}</p>`
  : Array.isArray(x) ? `<ul>${x.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : `<h3>${esc(x.h)}</h3>`).join('');
const notFound = (req, res, back, label) => res.status(404).send(layout(req, 'Không tìm thấy', `<div class="head"><h2>Không tìm thấy trang</h2></div><p><a href="${back}">${label}</a></p>`));

app.get('/policy/:slug', (req, res) => {
  const p = POLICIES[req.params.slug];
  if (!p) return notFound(req, res, '/', 'Về trang chủ');
  const side = `<aside class="side"><b>Chính sách</b>${Object.entries(POLICIES).map(([s, x]) => `<a class="${s === req.params.slug ? 'on' : ''}" href="/policy/${s}">${x.title}</a>`).join('')}</aside>`;
  res.send(page(req, p.title, { k: 'Hướng dẫn khách hàng', t: p.title, g: 'Policy', c: ['#2b2f3a', '#0c1b2e'] },
    `<div class="crumb"><a href="/">Trang chủ</a> / <span>${p.title}</span></div>
<div class="doc">${side}<article class="prose"><h1>${p.title}</h1><p class="meta">Cập nhật: 21/10/2026</p>${renderBody(p.sec)}
<p>Cần hỗ trợ thêm? <a href="/contact">Liên hệ SportZone</a> hoặc gọi 1800 0000.</p></article></div>`));
});

app.get('/blog', (req, res) => res.send(page(req, 'Blog', { k: 'Kinh nghiệm & mẹo hay', t: 'Blog', g: 'Blog', c: ['#1f5fbf', '#0c1b2e'] },
  `<div class="crumb"><a href="/">Trang chủ</a> / <span>Blog</span></div>
<div class="head"><h2>Tin tức mới nhất</h2><span>${NEWS.length} bài viết</span></div>
<div class="news">${NEWS.map(n => `<a class="nw" href="/blog/${n.slug}"><div class="nimg" style="${nstyle(n)}"></div><small>Đăng lúc: ${n.d}</small><h3>${esc(n.t)}</h3><p>${esc(n.s)}</p><span>Đọc tiếp</span></a>`).join('')}</div>`)));

app.get('/blog/:slug', (req, res) => {
  const n = NEWS.find(x => x.slug === req.params.slug);
  if (!n) return notFound(req, res, '/blog', 'Về trang Blog');
  const more = NEWS.filter(x => x !== n).slice(0, 3);
  res.send(page(req, n.t, { k: 'Blog', t: 'Tin tức', g: 'Blog', c: n.c },
    `<div class="crumb"><a href="/">Trang chủ</a> / <a href="/blog">Blog</a> / <span>${esc(n.t)}</span></div>
<article class="prose"><div class="cover" style="${nstyle(n)}"></div><h1>${esc(n.t)}</h1><p class="meta">Đăng lúc: ${n.d}</p>${renderBody(n.body)}<a class="back" href="/blog">← Quay lại Blog</a></article>
<section class="row" style="margin-top:48px"><div class="head"><h2>BÀI VIẾT KHÁC</h2></div><div class="news">${more.map(m =>
      `<a class="nw" href="/blog/${m.slug}"><div class="nimg" style="${nstyle(m)}"></div><small>Đăng lúc: ${m.d}</small><h3>${esc(m.t)}</h3><span>Đọc tiếp</span></a>`).join('')}</div></section>`));
});

// ---------- Auth ----------
app.get('/auth/google', (req, res, next) => GOOGLE_ON
  ? passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
  : res.status(503).send('Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env'));
app.get('/auth/google/callback', (req, res, next) => GOOGLE_ON
  ? passport.authenticate('google', { failureRedirect: '/' })(req, res, () => res.redirect('/'))
  : res.redirect('/'));
if (!mongoConnection) {
mongoConnection
  .then(() => app.listen(PORT, () => console.log('Chạy tại ' + BASE)))
  .catch(() => {
    console.error('Không thể kết nối MongoDB. Hãy kiểm tra MONGODB_URI và quyền truy cập mạng của MongoDB Atlas.');
    process.exitCode = 1;
  });
}