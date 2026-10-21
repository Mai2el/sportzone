function createAuthController({ User, authView }) {
  const loginSession = (req, user) => new Promise((resolve, reject) => {
    req.login(user, error => error ? reject(error) : resolve());
  });

  return {
    showLogin(req, res) {
      res.send(authView.renderAuthPage(req, 'login'));
    },

    showRegister(req, res) {
      res.send(authView.renderAuthPage(req, 'register'));
    },

    async register(req, res, next) {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      if (!name || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 120
        || password.length < 8 || password.length > 128) {
        return res.redirect('/register?error=invalid');
      }

      try {
        const user = await User.createLocal({ name, email, password });
        await loginSession(req, user);
        return res.redirect('/');
      } catch (error) {
        if (error.code === 11000) return res.redirect('/register?error=exists');
        return next(error);
      }
    },

    async login(req, res, next) {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length > 128) {
        return res.redirect('/login?error=credentials');
      }

      try {
        const user = await User.findByEmailForLogin(email);
        if (!user || !user.passwordHash || !(await user.verifyPassword(password))) {
          return res.redirect('/login?error=credentials');
        }
        await loginSession(req, user);
        return res.redirect('/');
      } catch (error) {
        return next(error);
      }
    },

    logout(req, res, next) {
      req.logout(error => {
        if (error) return next(error);
        req.session.destroy(sessionError => {
          if (sessionError) return next(sessionError);
          res.clearCookie('sportzone.sid', { path: '/' });
          return res.redirect('/');
        });
      });
    },
  };
}

module.exports = createAuthController;