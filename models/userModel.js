const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true },
  avatar: { type: String, default: '' },
}, { timestamps: true });

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.createLocal = async function ({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return this.create({ name, email: email.toLowerCase().trim(), passwordHash });
};

userSchema.statics.findByEmailForLogin = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
};

userSchema.statics.findOrCreateGoogle = async function (profile) {
  let user = await this.findOne({ googleId: profile.id });
  if (user) return { user, created: false };

  const emailVerified = profile._json?.email_verified === true;
  const email = emailVerified ? profile.emails?.[0]?.value?.toLowerCase() : undefined;
  if (email) {
    user = await this.findOne({ email });
    if (user) {
      user.googleId = profile.id;
      user.avatar = profile.photos?.[0]?.value || user.avatar;
      await user.save();
      return { user, created: false };
    }
  }

  user = await this.create({
    name: profile.displayName || email || 'SportZone user',
    ...(email ? { email } : {}),
    googleId: profile.id,
    avatar: profile.photos?.[0]?.value || '',
  });
  return { user, created: true };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);