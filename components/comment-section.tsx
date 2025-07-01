"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MessageCircle, Send, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Comment {
  _id: string
  content: string
  author: {
    name: string
    image: string
    email: string
  }
  createdAt: string
}

interface CommentSectionProps {
  articleId: string
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [articleId])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?articleId=${articleId}`)
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to post a comment.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!newComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter a comment before posting.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId,
          content: newComment,
        }),
      })

      if (response.ok) {
        setNewComment("")
        fetchComments()
        toast({
          title: "Comment posted!",
          description: "Your comment has been posted successfully.",
        })
      } else {
        throw new Error("Failed to post comment")
      }
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignInPrompt = () => {
    toast({
      title: "Sign in to comment",
      description: "Join the conversation by signing in to your account.",
    })
    router.push("/login")
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-12 border-t border-gray-200">
      <div className="flex items-center mb-8">
        <MessageCircle className="h-6 w-6 mr-2" />
        <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
      </div>

      {/* Comment Form */}
      {session ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onSubmit={handleSubmitComment}
          className="mb-8"
        >
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user?.image || ""} />
                  <AvatarFallback>{session.user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{session.user?.name}</span>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Share your thoughts about this article..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-4 min-h-[100px]"
                disabled={loading}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Be respectful and constructive in your comments.</p>
                <Button type="submit" disabled={loading || !newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.form>
      ) : (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Join the conversation</h3>
              <p className="text-gray-600 mb-4">Sign in to share your thoughts and engage with other readers.</p>
              <Button onClick={handleSignInPrompt}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment, index) => (
          <motion.div
            key={comment._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.image || "/placeholder.svg"} />
                      <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{comment.author.name}</span>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{comment.content}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
          <p>Be the first to share your thoughts about this article!</p>
        </div>
      )}
    </section>
  )
}
