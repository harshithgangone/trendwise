import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleContent } from "@/components/article-content"
import { CommentSection } from "@/components/comment-section"

interface ArticlePageProps {
  params: {
    slug: string
  }
}

interface Article {
  _id: string
  title: string
  slug: string
  content: string
  excerpt: string
  thumbnail: string
  author: string
  createdAt: string
  readTime: number
  views: number
  likes: number
  saves: number
  category: string
  tags: string[]
  featured?: boolean
  trending?: boolean
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    console.log(`🔍 [ARTICLE PAGE] Starting fetch for slug: ${slug}`)
    console.log(`🔍 [ARTICLE PAGE] Process env VERCEL_URL: ${process.env.VERCEL_URL}`)
    console.log(`🔍 [ARTICLE PAGE] Process env NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL}`)

    // Use the current domain for API calls
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://trendwise-frontend.vercel.app"

    const apiUrl = `${baseUrl}/api/articles/${slug}`
    console.log(`🌐 [ARTICLE PAGE] Full API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
    })

    console.log(`📡 [ARTICLE PAGE] API Response status: ${response.status}`)
    console.log(`📡 [ARTICLE PAGE] API Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error(`❌ [ARTICLE PAGE] Failed to fetch article: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ [ARTICLE PAGE] Error response body: ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log(`✅ [ARTICLE PAGE] Successfully fetched article data:`, {
      success: data.success,
      hasArticle: !!data.article,
      title: data.article?.title,
      slug: data.article?.slug,
      hasContent: !!data.article?.content,
      contentLength: data.article?.content?.length,
    })

    if (!data.success || !data.article) {
      console.error(`❌ [ARTICLE PAGE] Invalid response structure:`, data)
      return null
    }

    return data.article
  } catch (error) {
    console.error("❌ [ARTICLE PAGE] Error fetching article:", error)
    console.error("❌ [ARTICLE PAGE] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return null
  }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  console.log(`🏷️ [METADATA] Generating metadata for slug: ${params.slug}`)

  const article = await getArticle(params.slug)

  if (!article) {
    console.log(`🏷️ [METADATA] No article found, using default metadata`)
    return {
      title: "Article Not Found - TrendWise",
      description: "The requested article could not be found.",
    }
  }

  console.log(`🏷️ [METADATA] Generated metadata for: ${article.title}`)

  return {
    title: `${article.title} - TrendWise`,
    description: article.excerpt || "Read the latest trending news and insights on TrendWise.",
    keywords: article.tags?.join(", ") || "news, trends, technology",
    authors: [{ name: article.author || "TrendWise AI" }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
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
      description: article.excerpt,
      images: [article.thumbnail || "/placeholder.svg?height=630&width=1200"],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  console.log(`📄 [ARTICLE PAGE] Rendering page for slug: ${params.slug}`)
  console.log(`📄 [ARTICLE PAGE] Params object:`, params)

  const article = await getArticle(params.slug)

  if (!article) {
    console.log(`❌ [ARTICLE PAGE] Article not found, showing 404: ${params.slug}`)
    notFound()
  }

  console.log(`✅ [ARTICLE PAGE] Successfully rendering article: ${article.title}`)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ArticleContent article={article} />
        <div className="mt-12">
          <CommentSection articleId={article._id} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
