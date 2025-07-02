const mongoose = require("mongoose")

const tweetSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  handle: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "/placeholder.svg?height=400&width=600",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    meta: {
      title: String,
      description: String,
      keywords: String,
    },
    media: {
      images: [String],
      videos: [String],
      tweets: [tweetSchema], // Proper schema for tweet objects
    },
    readTime: {
      type: Number,
      default: 5,
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
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    trendData: {
      source: String,
      originalQuery: String,
      trendScore: Number,
      searchVolume: String,
      geo: String,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    author: {
      type: String,
      default: "TrendWise AI",
    },
  },
  {
    timestamps: true,
  },
)

// Index for search and performance
articleSchema.index({ title: "text", content: "text", tags: "text" })
articleSchema.index({ createdAt: -1 })
articleSchema.index({ views: -1 })
articleSchema.index({ "trendData.trendScore": -1 })

module.exports = mongoose.model("Article", articleSchema)
