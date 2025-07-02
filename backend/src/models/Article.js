const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId
      },
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    preferences: {
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
      recentlyViewed: [
        {
          article: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Article",
          },
          viewedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      categories: [String],
      tags: [String],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12)
  }
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

// Create indexes
userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 })
userSchema.index({ role: 1 })

module.exports = mongoose.model("User", userSchema)
