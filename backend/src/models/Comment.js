const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      image: String,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Comment", commentSchema)
