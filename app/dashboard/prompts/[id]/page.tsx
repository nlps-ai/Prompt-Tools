'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Pin,
  GitBranch,
  Clock,
  User,
  FileText,
  Tag,
  History,
  Share,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface PromptDetail {
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
  versions: Array<{
    id: string
    version: string
    content: string
    createdAt: Date
  }>
  _count: {
    versions: number
  }
}

export default function PromptDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const promptId = params.id as string

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch prompt details
  const { data: prompt, isLoading, error } = useQuery<PromptDetail>({
    queryKey: ['prompt', promptId],
    queryFn: async () => {
      const response = await fetch(`/api/prompts/${promptId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prompt not found')
        }
        throw new Error('Failed to fetch prompt')
      }
      return response.json()
    },
    enabled: !!session && !!promptId,
  })

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('内容已复制到剪贴板')
    } catch (error) {
      toast.error('复制失败')
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个提示词吗？此操作无法撤销。')) {
      return
    }

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('提示词已删除')
        router.push('/dashboard/prompts')
      } else {
        toast.error('删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleTogglePin = async () => {
    if (!prompt) return

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: prompt.name,
          content: prompt.currentVersion?.content || '',
          source: prompt.source,
          notes: prompt.notes,
          tags: prompt.tags,
          pinned: !prompt.pinned,
        }),
      })

      if (response.ok) {
        toast.success(prompt.pinned ? '已取消置顶' : '已置顶')
        // Refresh the page
        window.location.reload()
      } else {
        toast.error('操作失败')
      }
    } catch (error) {
      toast.error('操作失败')
    }
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !prompt) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/prompts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">提示词不存在</h3>
              <p className="text-muted-foreground text-center mb-4">
                您要查看的提示词可能已被删除或您没有权限访问。
              </p>
              <Link href="/dashboard/prompts">
                <Button>返回列表</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/prompts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
          </Link>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePin}
            >
              <Pin className={`mr-2 h-4 w-4 ${prompt.pinned ? 'fill-current' : ''}`} />
              {prompt.pinned ? '取消置顶' : '置顶'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(prompt.currentVersion?.content || '')}
            >
              <Copy className="mr-2 h-4 w-4" />
              复制内容
            </Button>
            <Link href={`/dashboard/prompts/${promptId}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{prompt.name}</h1>
                {prompt.pinned && (
                  <Pin className="h-6 w-6 text-primary fill-current" />
                )}
              </div>
              
              {prompt.source && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">来源：</span>{prompt.source}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  创建于 {formatDateTime(prompt.createdAt)}
                </div>
                <div className="flex items-center">
                  <GitBranch className="mr-1 h-4 w-4" />
                  版本 {prompt.currentVersion?.version || '1.0.0'}
                </div>
                <div className="flex items-center">
                  <History className="mr-1 h-4 w-4" />
                  {prompt._count.versions} 个版本
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>提示词内容</CardTitle>
            <CardDescription>
              当前版本：{prompt.currentVersion?.version || '1.0.0'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Textarea
                value={prompt.currentVersion?.content || ''}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                placeholder="暂无内容"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(prompt.currentVersion?.content || '')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {prompt.notes && (
          <Card>
            <CardHeader>
              <CardTitle>备注</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{prompt.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle>版本历史</CardTitle>
            <CardDescription>
              查看此提示词的所有历史版本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prompt.versions.slice(0, 5).map((version) => (
                <div 
                  key={version.id} 
                  className={`p-4 rounded-lg border ${
                    version.id === prompt.currentVersionId 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={version.id === prompt.currentVersionId ? 'default' : 'outline'}
                      >
                        v{version.version}
                      </Badge>
                      {version.id === prompt.currentVersionId && (
                        <Badge variant="secondary">当前版本</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(version.createdAt)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {version.content.length > 100 
                      ? version.content.substring(0, 100) + '...' 
                      : version.content
                    }
                  </p>
                </div>
              ))}
              
              {prompt.versions.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  还有 {prompt.versions.length - 5} 个历史版本
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}