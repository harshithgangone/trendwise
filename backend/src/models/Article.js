const mongoose = require("mongoose")

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 500,
    },
    featuredImage: {
      type: String,
      default: null,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: true,
      enum: ["Technology", "Business", "Health", "Science", "Environment", "Sports", "Entertainment", "General"],
      default: "General",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    author: {
      type: String,
      required: true,
      default: "TrendBot AI",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    source: {
      name: String,
      url: String,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: String,
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
    shares: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        author: String,
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    trending: {
      type: Boolean,
      default: false,
    },
    trendScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    tweets: [
      {
        username: String,
        handle: String,
        text: String,
        link: String,
        timestamp: String,
        engagement: {
          likes: Number,
          retweets: Number,
          replies: Number,
        },
      },
    ],
    media: {
      images: [String],
      videos: [String],
      tweets: [
        {
          username: String,
          handle: String,
          text: String,
          link: String,
          timestamp: String,
          engagement: {
            likes: Number,
            retweets: Number,
            replies: Number,
          },
        },
      ],
    },
    twitterSearchUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better performance
articleSchema.index({ slug: 1 })
articleSchema.index({ status: 1, publishedAt: -1 })
articleSchema.index({ category: 1, status: 1 })
articleSchema.index({ trending: 1, trendScore: -1 })
articleSchema.index({ tags: 1 })
articleSchema.index({ title: "text", content: "text" })

// Virtual for URL
articleSchema.virtual("url").get(function () {
  return `/article/${this.slug}`
})

// Pre-save middleware
articleSchema.pre("save", function (next) {
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

module.exports = mongoose.model("Article", articleSchema)
