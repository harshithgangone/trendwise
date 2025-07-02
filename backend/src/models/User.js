const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  picture: {
    type: String,
    default: "/placeholder.svg?height=40&width=40",
  },
  googleId: {
    type: String,
    sparse: true,
  },
  provider: {
    type: String,
    enum: ["google", "email"],
    default: "google",
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  preferences: {
    categories: [String],
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },
  savedArticles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
    },
  ],
  likedArticles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
    },
  ],
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update updatedAt before saving
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Index for better query performance
userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 })

module.exports = mongoose.model("User", userSchema)
