import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';
import { notifyAdmins } from '../services/notificationService.js';

// Register a new ordinary user (citizen or researcher only; admins are seeded)
export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => e.message).join(', ') });
  }
  const { name, email, password, role } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const user = await User.create({ name, email, password, role });
  const token = signToken(user._id);

  // Notify admins that a new user registered
  await notifyAdmins({
    type: 'review_alert',
    title: 'New user registered',
    message: `${name} (${email}) joined as ${role}.`,
  }).catch(() => null);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token,
  });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => e.message).join(', ') });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const matched = await user.matchPassword(password);
  if (!matched) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken(user._id);
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    token,
  });
}

export async function getMe(req, res) {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatarUrl: req.user.avatarUrl,
    createdAt: req.user.createdAt,
  });
}

export async function updateProfile(req, res) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => e.message).join(', ') });
  }
  const user = await User.findById(req.user._id);
  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) user.avatarUrl = parsed.data.avatarUrl;
  await user.save();
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  });
}

export default { register, login, getMe, updateProfile };
