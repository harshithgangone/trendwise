import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { ArticleContent } from "@/components/article-content"
import { CommentSection } from "@/components/comment-section"
import { Footer } from "@/components/footer"
import { ErrorBoundary } from "@/components/ErrorBoundary"

interface ArticlePageProps {
  params: {
    slug: string
  }
}

async function getArticle(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/articles/${slug}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const article = await response.json()
    return article
  } catch (error) {
    console.error("Error fetching article:", error)
    return null
  }
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug)

  if (!article) {
    return {
      title: "Article Not Found - TrendWise",
      description: "The requested article could not be found.",
    }
  }

  return {
    title: `${article.title} - TrendWise`,
    description: article.meta?.description || article.excerpt,
    keywords: article.meta?.keywords || article.tags?.join(", "),
    openGraph: {
      title: article.title,
      description: article.meta?.description || article.excerpt,
      type: "article",
      publishedTime: article.createdAt,
      authors: [article.author || "TrendWise AI"],
      images: [
        {
          url: article.thumbnail || "/placeholder.svg?height=630&width=1200",
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta?.description || article.excerpt,
      images: [article.thumbnail || "/placeholder.svg?height=630&width=1200"],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <ErrorBoundary>
          <ArticleContent article={article} />
        </ErrorBoundary>
        <ErrorBoundary>
          <CommentSection articleId={article._id} />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
