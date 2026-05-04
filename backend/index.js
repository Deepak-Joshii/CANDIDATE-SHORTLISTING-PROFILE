const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ================= SCHEMAS =================

// 🔹 User (Recruiter)
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

const User = mongoose.model("User", UserSchema);

// 🔹 Candidate
const CandidateSchema = new mongoose.Schema({
  name: String,
  email: String,
  skills: [String],
  experience: Number,
  createdAt: { type: Date, default: Date.now }
});

const Candidate = mongoose.model("Candidate", CandidateSchema);

// ================= MIDDLEWARE =================

// 🔐 JWT Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid Token" });
  }
};

// ================= MATCH LOGIC =================
function matchCandidates(candidates, job) {
  return candidates.map(candidate => {
    const matchedSkills = candidate.skills.filter(skill =>
      job.requiredSkills.includes(skill)
    );

    const score = matchedSkills.length / job.requiredSkills.length;

    let level = "Low";
    if (score >= 0.75) level = "High";
    else if (score >= 0.4) level = "Medium";

    return {
      ...candidate._doc,
      matchScore: score,
      matchedSkills,
      level
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

// ================= AUTH ROUTES =================

// 🔹 Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.json({ message: "User Registered Successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CANDIDATE ROUTES =================

// 🔹 Add Candidate
app.post("/api/candidates", authMiddleware, async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    await candidate.save();
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get Candidates
app.get("/api/candidates", authMiddleware, async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MATCH ROUTES =================

// 🔹 Basic Matching
app.post("/api/match", authMiddleware, async (req, res) => {
  try {
    const { requiredSkills, minExperience } = req.body;

    const candidates = await Candidate.find({
      experience: { $gte: minExperience }
    });

    const result = matchCandidates(candidates, { requiredSkills });

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 AI Matching (FIXED)
app.post("/api/ai/shortlist", authMiddleware, async (req, res) => {
  try {
    const { requiredSkills, minExperience } = req.body;

    const candidates = await Candidate.find({
      experience: { $gte: minExperience }
    });

    if (candidates.length === 0) {
      return res.json({
        aiResult: "No candidates available",
        candidates: []
      });
    }

    const candidateText = candidates.map((c, i) =>
      `${i + 1}. ${c.name} - ${c.skills.join(", ")} - ${c.experience} years`
    ).join("\n");

    const prompt = `
Job requires: ${requiredSkills.join(", ")} (${minExperience}+ years experience)

Candidates:
${candidateText}

Rank candidates from best to worst and explain why.
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // ✅ FIXED MODEL
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    // 🔍 DEBUG (VERY IMPORTANT)
    console.log("OpenRouter Response:", JSON.stringify(data, null, 2));

    if (data.error) {
      return res.json({
        aiResult: `AI Error: ${data.error.message}`,
        candidates
      });
    }

    res.json({
      aiResult: data.choices?.[0]?.message?.content || "AI did not return valid output",
      candidates
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});