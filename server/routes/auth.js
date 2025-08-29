import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log('Login attempt for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'User not found. Please contact admin to migrate your account.' });
    }

    console.log('User found:', user.email, 'Role:', user.role);

    // Since passwords are stored in plain text, compare directly
    const isMatch = password === user.password;

    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      console.log('Expected:', user.password, 'Received:', password);
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('Login successful for:', email);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Create initial admin user
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = new User({
      email,
      password: hashedPassword,
      name,
      department: 'Administration',
      role: 'admin',
      employeeId: 'ADMIN001',
      isActive: true,
      baseSalary: 0
    });

    await adminUser.save();

    console.log('Admin user created:', email);
    res.json({ message: 'Admin user created successfully' });
  } catch (err) {
    console.error('Admin creation error:', err);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Check if any admin exists
router.get('/check-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    res.json({ adminExists: !!adminExists });
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ message: 'Error checking admin status' });
  }
});

export default router;