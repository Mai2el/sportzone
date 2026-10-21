const messages = {
  invalid: 'Thông tin đăng nhập không hợp lệ.',
  exists: 'Email này đã được đăng ký.',
  credentials: 'Email hoặc mật khẩu không chính xác.',
  unavailable: 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.',
};

const field = (name, label, type, attributes = '') => `<label>${label}<input name="${name}" type="${type}" ${attributes} required></label>`;

function renderAuthPage(layout, req, mode) {
  const registering = mode === 'register';
  const title = registering ? 'Tạo tài khoản' : 'Đăng nhập';
  const error = messages[req.query.error] || '';
  const fields = registering
    ? `${field('name', 'Họ tên', 'text', 'autocomplete="name" maxlength="80"')}\n${field('email', 'Email', 'email', 'autocomplete="email" maxlength="120"')}\n${field('password', 'Mật khẩu', 'password', 'autocomplete="new-password" minlength="8" maxlength="128"')}`
    : `${field('email', 'Email', 'email', 'autocomplete="email" maxlength="120"')}\n${field('password', 'Mật khẩu', 'password', 'autocomplete="current-password" maxlength="128"')}`;

  return layout(req, title, `<section class="auth"><h1>${title}</h1>
${error ? `<p class="err" role="alert">${error}</p>` : ''}
<form class="contact" method="post" action="/${mode}">${fields}<button>${title}</button></form>
<p>${registering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <a href="/${registering ? 'login' : 'register'}">${registering ? 'Đăng nhập' : 'Đăng ký'}</a></p>
<p><a href="/auth/google">Tiếp tục với Google</a></p></section>`);
}

module.exports = { renderAuthPage };