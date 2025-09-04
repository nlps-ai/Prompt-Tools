'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PromptCard } from '@/components/prompts/prompt-card'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Star,
  Clock,
  Tags,
} from 'lucide-react'

interface Prompt {
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

interface PromptsResponse {
  prompts: Prompt[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function PromptsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [showPinnedOnly, setShowPinnedOnly] = useState(
    searchParams.get('pinned') === 'true'
  )

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Build query params
  const queryParams = new URLSearchParams()
  if (searchTerm) queryParams.set('search', searchTerm)
  if (selectedTags.length > 0) queryParams.set('tags', selectedTags.join(','))
  if (showPinnedOnly) queryParams.set('pinned', 'true')
  queryParams.set('limit', '20')

  // Fetch prompts
  const { data, isLoading, error, refetch } = useQuery<PromptsResponse>({
    queryKey: ['prompts', searchTerm, selectedTags, showPinnedOnly],
    queryFn: async () => {
      const response = await fetch(`/api/prompts?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch prompts')
      }
      return response.json()
    },
    enabled: !!session,
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Update URL params
    const newParams = new URLSearchParams(searchParams)
    if (searchTerm) {
      newParams.set('search', searchTerm)
    } else {
      newParams.delete('search')
    }
    router.push(`/dashboard/prompts?${newParams.toString()}`)
  }

  const handleTagFilter = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(newTags)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedTags([])
    setShowPinnedOnly(false)
    router.push('/dashboard/prompts')
  }

  const handlePromptEdit = (prompt: Prompt) => {
    router.push(`/dashboard/prompts/${prompt.id}/edit`)
  }

  const handlePromptDelete = async (id: string) => {
    if (!confirm('确定要删除这个提示词吗？此操作无法撤销。')) {
      return
    }

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('提示词已删除')
        refetch()
      } else {
        toast.error('删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handlePromptTogglePin = async (id: string) => {
    try {
      // Get current prompt to toggle pin status
      const currentPrompt = data?.prompts.find(p => p.id === id)
      if (!currentPrompt) return

      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: currentPrompt.name,
          content: currentPrompt.currentVersion?.content || '',
          source: currentPrompt.source,
          notes: currentPrompt.notes,
          tags: currentPrompt.tags,
          pinned: !currentPrompt.pinned,
        }),
      })

      if (response.ok) {
        toast.success(currentPrompt.pinned ? '已取消置顶' : '已置顶')
        refetch()
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

  const handlePromptViewDetails = (prompt: Prompt) => {
    router.push(`/dashboard/prompts/${prompt.id}`)
  }

  // Get all unique tags for filter
  const allTags = data?.prompts.reduce((tags: string[], prompt) => {
    prompt.tags.forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag)
      }
    })
    return tags
  }, []) || []

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的提示词</h1>
            <p className="mt-2 text-gray-600">
              管理您的所有 AI 提示词，搜索、分类和优化您的提示词库。
            </p>
          </div>
          <Link href="/dashboard/prompts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建新提示词
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索提示词名称或内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">搜索</Button>
              </form>

              {/* Filter options */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={showPinnedOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                >
                  <Star className="mr-1 h-3 w-3" />
                  置顶
                </Button>

                {/* Tag filters */}
                {allTags.slice(0, 10).map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTagFilter(tag)}
                  >
                    <Tags className="mr-1 h-3 w-3" />
                    {tag}
                  </Button>
                ))}

                {(searchTerm || selectedTags.length > 0 || showPinnedOnly) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    清除筛选
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View controls */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {data ? `共 ${data.pagination.total} 个提示词` : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Prompts Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">加载失败</h3>
              <p className="text-muted-foreground text-center mb-4">
                无法加载提示词列表，请稍后重试。
              </p>
              <Button onClick={() => refetch()}>重试</Button>
            </CardContent>
          </Card>
        ) : data && data.prompts.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {data.prompts.map((prompt) => (
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
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || selectedTags.length > 0 || showPinnedOnly 
                  ? '没有找到匹配的提示词' 
                  : '暂无提示词'
                }
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedTags.length > 0 || showPinnedOnly
                  ? '尝试调整搜索条件或清除筛选器。'
                  : '您还没有创建任何提示词。立即开始创建您的第一个提示词吧！'
                }
              </p>
              {searchTerm || selectedTags.length > 0 || showPinnedOnly ? (
                <Button onClick={clearFilters}>清除筛选</Button>
              ) : (
                <Link href="/dashboard/prompts/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个提示词
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}