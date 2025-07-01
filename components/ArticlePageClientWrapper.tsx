"use client"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ArticleContent } from "@/components/article-content"
import { CommentSection } from "@/components/comment-section"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Suspense } from "react"

export default function ArticlePageClientWrapper({ article }: { article: any }) {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <ArticleContent article={article} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <CommentSection articleId={article._id} />
        </Suspense>
      </ErrorBoundary>
    </>
  )
} 