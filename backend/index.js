const dns = require('dns').promises;   // or just require('dns') in older Node
dns.setServers(['8.8.8.8', '1.1.1.1']);   // to fix DNS refused block error

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// If fetch gives error then uncomment next line
// const fetch = require("node-fetch");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());

// ================= DATABASE CONNECTION =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ================= SCHEMAS =================

// 🔹 User Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  }
});

const User = mongoose.model("User", UserSchema);

// 🔹 Candidate Schema
const CandidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  skills: {
    type: [String],
    required: true
  },

  experience: {
    type: Number,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Candidate = mongoose.model("Candidate", CandidateSchema);

// ================= JWT AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Access Denied. No token provided"
    });
  }

  // Supports both:
  // Authorization: TOKEN
  // Authorization: Bearer TOKEN

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (err) {

    res.status(401).json({
      error: "Invalid Token"
    });
  }
};

// ================= MATCH LOGIC =================
function matchCandidates(candidates, job) {

  return candidates.map(candidate => {

    const matchedSkills = candidate.skills.filter(skill =>
      job.requiredSkills.includes(skill)
    );

    const score =
      matchedSkills.length / job.requiredSkills.length;

    let level = "Low";

    if (score >= 0.75) {
      level = "High";
    } else if (score >= 0.4) {
      level = "Medium";
    }

    return {
      ...candidate._doc,
      matchScore: score,
      matchedSkills,
      level
    };

  }).sort((a, b) => b.matchScore - a.matchScore);
}

// ================= AUTH ROUTES =================

// 🔹 REGISTER
app.post("/api/auth/register", async (req, res) => {

  try {

    const { name, email, password } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already exists"
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "User Registered Successfully"
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 LOGIN
app.post("/api/auth/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    // Compare password
    const isMatch =
      await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login Successful",
      token
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ================= CANDIDATE ROUTES =================

// 🔹 ADD CANDIDATE
app.post("/api/candidates", authMiddleware, async (req, res) => {

  try {

    const candidate = new Candidate(req.body);

    await candidate.save();

    res.status(201).json({
      message: "Candidate Added Successfully",
      candidate
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 GET ALL CANDIDATES
app.get("/api/candidates", authMiddleware, async (req, res) => {

  try {

    const candidates = await Candidate.find();

    res.json(candidates);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 GET CANDIDATE BY ID
app.get("/api/candidates/:id", authMiddleware, async (req, res) => {

  try {

    const candidate =
      await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        error: "Candidate not found"
      });
    }

    res.json(candidate);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 UPDATE CANDIDATE
app.put("/api/candidates/:id", authMiddleware, async (req, res) => {

  try {

    const updatedCandidate =
      await Candidate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!updatedCandidate) {
      return res.status(404).json({
        error: "Candidate not found"
      });
    }

    res.json({
      message: "Candidate Updated Successfully",
      updatedCandidate
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 DELETE CANDIDATE
app.delete("/api/candidates/:id", authMiddleware, async (req, res) => {

  try {

    const deletedCandidate =
      await Candidate.findByIdAndDelete(req.params.id);

    if (!deletedCandidate) {
      return res.status(404).json({
        error: "Candidate not found"
      });
    }

    res.json({
      message: "Candidate Deleted Successfully"
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// 🔹 SEARCH CANDIDATE
app.get("/api/candidates/search/:skill", authMiddleware, async (req, res) => {

  try {

    const skill = req.params.skill;

    const candidates = await Candidate.find({
      skills: {
        $regex: skill,
        $options: "i"
      }
    });

    res.json(candidates);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ================= BASIC MATCH ROUTE =================

// 🔹 BASIC MATCHING
app.post("/api/match", authMiddleware, async (req, res) => {

  try {

    const {
      requiredSkills,
      minExperience
    } = req.body;

    const candidates = await Candidate.find({
      experience: {
        $gte: minExperience
      }
    });

    const result =
      matchCandidates(candidates, {
        requiredSkills
      });

    res.json(result);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ================= AI SHORTLIST ROUTE =================

// 🔹 AI MATCHING
app.post("/api/ai/shortlist", authMiddleware, async (req, res) => {

  try {

    const {
      requiredSkills,
      minExperience
    } = req.body;

    const candidates = await Candidate.find({
      experience: {
        $gte: minExperience
      }
    });

    if (candidates.length === 0) {

      return res.json({
        aiResult: "No candidates available",
        candidates: []
      });
    }

    const candidateText =
      candidates.map((c, i) =>
        `${i + 1}. ${c.name} - Skills: ${c.skills.join(", ")} - Experience: ${c.experience} years`
      ).join("\n");

    const prompt = `
Job Requirements:
Skills: ${requiredSkills.join(", ")}
Minimum Experience: ${minExperience}+ years

Candidates:
${candidateText}

Rank the candidates from best to worst.
Explain why each candidate is suitable.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "openai/gpt-4o-mini",

          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(
      "OpenRouter Response:",
      JSON.stringify(data, null, 2)
    );

    if (data.error) {

      return res.status(400).json({
        error: data.error.message
      });
    }

    res.json({
      aiResult:
        data.choices?.[0]?.message?.content
        || "No AI response received",

      candidates
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 AI Recruitment Backend Running");
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});