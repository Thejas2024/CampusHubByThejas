
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db.cjs");

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
    const body = req.body || {};
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const { password } = body;

    if (
      !/^[A-Za-z0-9_]{3,30}$/.test(username) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "Enter a valid username, email, and password (6–128 characters)"
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM students WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "That username or email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO students (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "Account created. You can sign in now."
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
    const body = req.body || {};
    const { password } = body;
    const identifier = body.identifier || body.username || body.email;

    if (
      typeof identifier !== "string" ||
      !identifier.trim() ||
      identifier.trim().length > 254 ||
      typeof password !== "string" ||
      !password ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "A valid username or email and password are required"
      });
    }

    const normalizedIdentifier = identifier.trim();
    const [rows] = await db.execute(
      `SELECT id, username, email, password
       FROM students
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [normalizedIdentifier, normalizedIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username/email or password"
      });
    }

    const student = rows[0];

    const isMatch = await bcrypt.compare(
      password,
      student.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username/email or password"
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
