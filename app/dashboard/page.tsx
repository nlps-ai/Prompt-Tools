'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PromptCard } from '@/components/prompts/prompt-card'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  TrendingUp,
  Clock,
  Star,
  Tag,
  Activity,
  Users,
} from 'lucide-react'

interface DashboardStats {
  totalPrompts: number
  pinnedPrompts: number
  totalVersions: number
  recentActivity: number
}

interface RecentPrompt {
  id: string
  name: string
  source?: string
  notes?: string
  tags: string[]
  pinned: boolean
  createdAt: Date
  updatedAt: Date
  currentVersionId?: string
  userId: string
  currentVersion?: {
    version: string
    content: string
  }
  _count: {
    versions: number
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      return response.json()
    },
    enabled: !!session,
  })

  // Fetch recent prompts
  const { data: recentPrompts, isLoading: promptsLoading } = useQuery<RecentPrompt[]>({
    queryKey: ['recent-prompts'],
    queryFn: async () => {
      const response = await fetch('/api/prompts?limit=6&sortBy=updatedAt&sortOrder=desc')
      if (!response.ok) {
        throw new Error('Failed to fetch prompts')
      }
      const data = await response.json()
      return data.prompts || []
    },
    enabled: !!session,
  })

  const handlePromptEdit = (prompt: RecentPrompt) => {
    router.push(`/dashboard/prompts/${prompt.id}/edit`)
  }

  const handlePromptDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('提示词已删除')
        // Refetch data
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      } else {
        toast.error('删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handlePromptTogglePin = async (id: string) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinned: true }), // Toggle logic would be on backend
      })

      if (response.ok) {
        toast.success('操作成功')
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      } else {
        toast.error('操作失败')
      }
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handlePromptCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('内容已复制到剪贴板')
    } catch (error) {
      toast.error('复制失败')
    }
  }

  const handlePromptViewDetails = (prompt: RecentPrompt) => {
    router.push(`/dashboard/prompts/${prompt.id}`)
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              欢迎回来，{session.user?.name}
            </h1>
            <p className="mt-2 text-gray-600">
              这是您的提示词管理仪表盘，管理和优化您的 AI 提示词库。
            </p>
          </div>
          <Link href="/dashboard/prompts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建新提示词
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总提示词数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalPrompts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                您的提示词库总数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">置顶提示词</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.pinnedPrompts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                已置顶的重要提示词
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总版本数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalVersions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                所有提示词的版本总数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本周活动</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.recentActivity || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                本周编辑和创建的数量
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Prompts */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">最近的提示词</h2>
            <Link href="/dashboard/prompts">
              <Button variant="outline" size="sm">
                查看全部
              </Button>
            </Link>
          </div>

          {promptsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentPrompts && recentPrompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={handlePromptEdit}
                  onDelete={handlePromptDelete}
                  onTogglePin={handlePromptTogglePin}
                  onCopy={handlePromptCopy}
                  onViewDetails={handlePromptViewDetails}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无提示词</h3>
                <p className="text-muted-foreground text-center mb-4">
                  您还没有创建任何提示词。立即开始创建您的第一个提示词吧！
                </p>
                <Link href="/dashboard/prompts/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个提示词
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/dashboard/prompts/new">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    创建新提示词
                  </CardTitle>
                  <CardDescription>
                    开始创建一个全新的 AI 提示词
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard/prompts?pinned=true">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="mr-2 h-5 w-5" />
                    查看置顶提示词
                  </CardTitle>
                  <CardDescription>
                    管理您最重要的提示词
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    账户设置
                  </CardTitle>
                  <CardDescription>
                    管理您的账户和偏好设置
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}