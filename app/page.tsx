import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Zap, Shield, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="container relative flex min-h-[90vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f0f9ff_1px,transparent_1px),linear-gradient(to_bottom,#f0f9ff_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            全新 Web 版本正式上线
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl gradient-text">
            AI 提示词管理专家
          </h1>
          
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            专业的云端 AI 提示词管理平台，支持智能分类、版本控制、团队协作和 AI 优化功能，让您的 Prompt 管理更加高效
          </p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/auth/signin">
              立即开始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button variant="outline" size="lg" className="h-12 px-8" asChild>
            <Link href="#features">
              了解更多功能
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            强大的功能特性
          </h2>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
            从个人使用到团队协作，Prompt Tools 提供全方位的解决方案
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI 智能优化</h3>
            <p className="text-muted-foreground">
              集成先进的 AI 模型，自动优化您的提示词效果和表达方式
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">版本控制</h3>
            <p className="text-muted-foreground">
              完整的版本管理系统，支持回滚、分支和变更历史跟踪
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">团队协作</h3>
            <p className="text-muted-foreground">
              支持多人协作编辑，实时同步，团队知识共享
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">智能分类</h3>
            <p className="text-muted-foreground">
              自动标签识别，智能分类管理，快速搜索定位
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}