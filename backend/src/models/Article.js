const mongoose = require("mongoose")

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 500,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["Technology", "Business", "Science", "Environment", "Healthcare", "Education", "Entertainment", "Sports"],
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  author: {
    type: String,
    default: "TrendBot AI",
  },
  thumbnail: {
    type: String,
    default: "/placeholder.svg?height=400&width=600",
  },
  featured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "published",
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  saves: {
    type: Number,
    default: 0,
  },
  readTime: {
    type: Number,
    default: 5,
  },
  source: {
    type: String,
    default: "AI Generated",
  },
  sourceUrl: String,
  publishedAt: {
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

// Create slug from title before saving
articleSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 100)
  }
  this.updatedAt = Date.now()
  next()
})

// Index for better query performance
articleSchema.index({ category: 1, createdAt: -1 })
articleSchema.index({ tags: 1 })
articleSchema.index({ slug: 1 })
articleSchema.index({ featured: 1, views: -1 })

module.exports = mongoose.model("Article", articleSchema)
