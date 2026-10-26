import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['citizen', 'researcher', 'admin'],
      default: 'citizen',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare candidate password against stored hash
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Never leak the password hash in JSON responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

// Unique index on email (schema already declares unique:true; index for clarity)
User.init();

export default User;
