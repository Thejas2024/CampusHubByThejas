
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://your-campushub.vercel.app"
  ]
}));

app.use(express.json());

// Test backend
app.get("/", (req, res) => {
  res.json({ message: "CampusHub Backend is running!" });
});

// Register Student
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM students WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO students (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "Registration successful"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Registration failed"
    });
  }
});

// Login Student
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.execute(
      "SELECT * FROM students WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const student = rows[0];

    const isMatch = await bcrypt.compare(
      password,
      student.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: student.id, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: student.id,
        username: student.username,
        email: student.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Login failed"
    });
  }
});

// Get jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const [jobs] = await db.execute(
      "SELECT * FROM jobs ORDER BY created_at DESC"
    );

    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch jobs"
    });
  }
});

// Add job
app.post("/api/jobs", async (req, res) => {
  try {
    const { title, company, location, description } = req.body;

    await db.execute(
      `INSERT INTO jobs (title, company, location, description)
       VALUES (?, ?, ?, ?)`,
      [title, company, location, description]
    );

    res.status(201).json({
      message: "Job added successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to add job"
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CampusHub backend running on port ${PORT}`);
});
