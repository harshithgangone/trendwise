const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Article",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },
  likes: {
    type: Number,
    default: 0,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
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
commentSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Index for better query performance
commentSchema.index({ articleId: 1, createdAt: -1 })
commentSchema.index({ userId: 1 })
commentSchema.index({ parentId: 1 })

module.exports = mongoose.model("Comment", commentSchema)
