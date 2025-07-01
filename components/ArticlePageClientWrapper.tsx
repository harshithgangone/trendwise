"use client"

import { useEffect } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ArticleContent } from "@/components/article-content"
import { CommentSection } from "@/components/comment-section"

export default function ArticlePageClientWrapper({ article }: { article: any }) {
  // Force client-side navigation for better compatibility
  useEffect(() => {
    // Override any navigation issues by ensuring proper client-side routing
    const handleNavigation = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === "A" && target.getAttribute("href")?.startsWith("/")) {
        e.preventDefault()
        const href = target.getAttribute("href")
        if (href) {
          window.location.href = href
        }
      }
    }

    document.addEventListener("click", handleNavigation)
    return () => document.removeEventListener("click", handleNavigation)
  }, [])

  return (
    <div className="article-wrapper">
      <ErrorBoundary>
        <ArticleContent article={article} />
      </ErrorBoundary>
      <ErrorBoundary>
        <CommentSection articleId={article._id} />
      </ErrorBoundary>
    </div>
  )
}
