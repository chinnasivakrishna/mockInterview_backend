const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

router.post('/add', async (req, res) => {
  const { Name, Email, Password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(Password, 10);
    const student = new Student({
      Name,
      email: Email,
      password: hashedPassword
    });
    await student.save();

    return res.status(201).json({ message: "Student added successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post('/login', async (req, res) => {
  const { Email, Password } = req.body;

  try {
    const student = await Student.findOne({ email: Email });

    if (!student) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(Password, student.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ email: student.email }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ message: "Login successful", student, token });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post('/update-premium', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await Student.updateOne(
      { email },
      { $set: { ispremium: true }}
    );

    if (result.nModified === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json({ message: 'Premium status updated successfully' });
  } catch (error) {
    console.error('Error updating premium status:', error);
    return res.status(500).json({ error: 'Failed to update premium status' });
  }
});

router.get('/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
