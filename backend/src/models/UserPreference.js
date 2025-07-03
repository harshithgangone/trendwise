const mongoose = require("mongoose")

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    likedArticles: [
      {
        articleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Article",
          required: true,
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    savedArticles: [
      {
        articleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Article",
          required: true,
        },
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    recentlyViewed: [
      {
        articleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Article",
          required: true,
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    preferences: {
      categories: [String],
      tags: [String],
      readingTime: {
        type: String,
        enum: ["short", "medium", "long", "any"],
        default: "any",
      },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
userPreferenceSchema.index({ userId: 1 })
userPreferenceSchema.index({ email: 1 })
userPreferenceSchema.index({ "likedArticles.articleId": 1 })
userPreferenceSchema.index({ "savedArticles.articleId": 1 })

// Limit recently viewed to 50 items
userPreferenceSchema.pre("save", function (next) {
  if (this.recentlyViewed.length > 50) {
    this.recentlyViewed = this.recentlyViewed.slice(-50)
  }
  next()
})

module.exports = mongoose.model("UserPreference", userPreferenceSchema)
