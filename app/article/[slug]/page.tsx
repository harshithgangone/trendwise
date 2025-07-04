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
    console.log(`🔍 [ARTICLE PAGE] ==========================================`)
    console.log(`🔍 [ARTICLE PAGE] Starting fetch for slug: ${slug}`)
    console.log(`🔍 [ARTICLE PAGE] Process env VERCEL_URL: ${process.env.VERCEL_URL}`)
    console.log(`🔍 [ARTICLE PAGE] Process env NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL}`)

    // Use multiple fallback URLs to ensure we can reach the API
    const possibleBaseUrls = [
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.NEXT_PUBLIC_SITE_URL,
      "https://trendwise-frontend.vercel.app",
      typeof window !== "undefined" ? window.location.origin : null,
    ].filter(Boolean)

    console.log(`🌐 [ARTICLE PAGE] Possible base URLs:`, possibleBaseUrls)

    let lastError: Error | null = null

    // Try each URL until one works
    for (const baseUrl of possibleBaseUrls) {
      try {
        const apiUrl = `${baseUrl}/api/articles/${encodeURIComponent(slug)}`
        console.log(`🌐 [ARTICLE PAGE] Trying API URL: ${apiUrl}`)

        const response = await fetch(apiUrl, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TrendWise-Frontend/1.0",
          },
        })

        console.log(`📡 [ARTICLE PAGE] API Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ [ARTICLE PAGE] Successfully fetched article data:`, {
            success: data.success,
            hasArticle: !!data.article,
            title: data.article?.title,
            slug: data.article?.slug,
            hasContent: !!data.article?.content,
            contentLength: data.article?.content?.length,
            source: data.source,
          })

          if (data.success && data.article) {
            console.log(`🔍 [ARTICLE PAGE] ==========================================`)
            return data.article
          }
        } else {
          const errorText = await response.text()
          console.error(`❌ [ARTICLE PAGE] Failed with ${baseUrl}: ${response.status} ${response.statusText}`)
          console.error(`❌ [ARTICLE PAGE] Error response: ${errorText}`)
          lastError = new Error(`HTTP ${response.status}: ${errorText}`)
        }
      } catch (urlError) {
        console.error(`❌ [ARTICLE PAGE] Error with ${baseUrl}:`, urlError)
        lastError = urlError instanceof Error ? urlError : new Error(String(urlError))
      }
    }

    console.error(`❌ [ARTICLE PAGE] All URLs failed. Last error:`, lastError)
    console.log(`🔍 [ARTICLE PAGE] ==========================================`)
    return null
  } catch (error) {
    console.error("❌ [ARTICLE PAGE] Critical error fetching article:", error)
    console.error("❌ [ARTICLE PAGE] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.log(`🔍 [ARTICLE PAGE] ==========================================`)
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
  console.log(`📄 [ARTICLE PAGE] ==========================================`)
  console.log(`📄 [ARTICLE PAGE] Rendering page for slug: ${params.slug}`)
  console.log(`📄 [ARTICLE PAGE] Params object:`, params)
  console.log(`📄 [ARTICLE PAGE] Timestamp: ${new Date().toISOString()}`)

  const article = await getArticle(params.slug)

  if (!article) {
    console.log(`❌ [ARTICLE PAGE] Article not found, showing 404: ${params.slug}`)
    console.log(`📄 [ARTICLE PAGE] ==========================================`)
    notFound()
  }

  console.log(`✅ [ARTICLE PAGE] Successfully rendering article: ${article.title}`)
  console.log(`📄 [ARTICLE PAGE] ==========================================`)

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
