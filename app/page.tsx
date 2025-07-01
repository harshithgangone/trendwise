import { Suspense } from "react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { ArticleGrid } from "@/components/article-grid"
import { SearchBar } from "@/components/search-bar"
import { Footer } from "@/components/footer"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main>
        <Hero />
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto mb-12">
            <SearchBar />
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <ArticleGrid />
          </Suspense>
        </section>
      </main>
      <Footer />
    </div>
  )
}
