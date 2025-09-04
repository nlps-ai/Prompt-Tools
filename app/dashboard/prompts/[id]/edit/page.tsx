'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Sparkles,
  GitBranch,
} from 'lucide-react'

const updatePromptSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
  content: z.string().min(1, '内容不能为空'),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  saveAsVersion: z.boolean().default(false),
  versionType: z.enum(['patch', 'minor', 'major']).default('patch'),
})

type UpdatePromptForm = z.infer<typeof updatePromptSchema>

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

export default function EditPromptPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const promptId = params.id as string
  
  const [isLoading, setIsLoading] = useState(false)
  const [currentTag, setCurrentTag] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false)

  // Fetch prompt details
  const { data: prompt, isLoading: promptLoading } = useQuery<PromptDetail>({
    queryKey: ['prompt', promptId],
    queryFn: async () => {
      const response = await fetch(`/api/prompts/${promptId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch prompt')
      }
      return response.json()
    },
    enabled: !!session && !!promptId,
  })

  const form = useForm<UpdatePromptForm>({
    resolver: zodResolver(updatePromptSchema),
    defaultValues: {
      name: '',
      content: '',
      source: '',
      notes: '',
      tags: [],
      saveAsVersion: false,
      versionType: 'patch',
    },
  })

  // Load prompt data into form when fetched
  useEffect(() => {
    if (prompt) {
      form.setValue('name', prompt.name)
      form.setValue('content', prompt.currentVersion?.content || '')
      form.setValue('source', prompt.source || '')
      form.setValue('notes', prompt.notes || '')
      form.setValue('tags', prompt.tags)
      setTags(prompt.tags)
    }
  }, [prompt, form])

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      const newTags = [...tags, currentTag.trim()]
      setTags(newTags)
      form.setValue('tags', newTags)
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setTags(newTags)
    form.setValue('tags', newTags)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const onSubmit = async (data: UpdatePromptForm) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tags,
          saveAsVersion: saveAsNewVersion,
        }),
      })

      if (response.ok) {
        toast.success(saveAsNewVersion ? '新版本已保存！' : '提示词已更新！')
        router.push(`/dashboard/prompts/${promptId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || '更新失败')
      }
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptimize = async () => {
    const content = form.getValues('content')
    if (!content.trim()) {
      toast.error('请先输入提示词内容')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          type: 'clarity',
        }),
      })

      if (response.ok) {
        const result = await response.json()
        form.setValue('content', result.optimizedContent)
        toast.success('内容已优化')
      } else {
        toast.error('优化失败')
      }
    } catch (error) {
      toast.error('优化失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (promptLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!prompt) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Link href="/dashboard/prompts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
          </Link>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">提示词不存在</h3>
              <p className="text-muted-foreground text-center mb-4">
                您要编辑的提示词可能已被删除或您没有权限访问。
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/prompts/${promptId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回详情
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleOptimize}
              disabled={isLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI 优化
            </Button>
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">编辑提示词</h1>
          <p className="mt-2 text-gray-600">
            编辑 "{prompt.name}" 的内容和信息
          </p>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>
                修改提示词的基本信息和内容
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 *
                </label>
                <Input
                  {...form.register('name')}
                  placeholder="为您的提示词起个名字"
                  disabled={isLoading}
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词内容 *
                </label>
                <Textarea
                  {...form.register('content')}
                  placeholder="输入您的提示词内容..."
                  className="min-h-[200px] font-mono"
                  disabled={isLoading}
                />
                {form.formState.errors.content && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.content.message}
                  </p>
                )}
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  来源（可选）
                </label>
                <Input
                  {...form.register('source')}
                  placeholder="提示词的来源，如：ChatGPT、Claude、自创等"
                  disabled={isLoading}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注（可选）
                </label>
                <Textarea
                  {...form.register('notes')}
                  placeholder="添加一些备注信息，如使用场景、注意事项等"
                  className="min-h-[80px]"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>标签</CardTitle>
              <CardDescription>
                修改标签以便分类和搜索
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Tag */}
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入标签名称"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!currentTag.trim() || isLoading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Control */}
          <Card>
            <CardHeader>
              <CardTitle>版本控制</CardTitle>
              <CardDescription>
                选择是否保存为新版本
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="saveAsVersion"
                    checked={saveAsNewVersion}
                    onChange={(e) => setSaveAsNewVersion(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="saveAsVersion" className="text-sm font-medium text-gray-700">
                    保存为新版本
                  </label>
                </div>
                
                {saveAsNewVersion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      版本类型
                    </label>
                    <select
                      {...form.register('versionType')}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      disabled={isLoading}
                    >
                      <option value="patch">补丁版本 (1.0.1)</option>
                      <option value="minor">小版本 (1.1.0)</option>
                      <option value="major">大版本 (2.0.0)</option>
                    </select>
                  </div>
                )}
                
                <p className="text-sm text-gray-500">
                  {saveAsNewVersion 
                    ? '将创建一个新版本，保留历史版本。'
                    : '将直接更新当前版本，不保留历史版本。'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link href={`/dashboard/prompts/${promptId}`}>
              <Button type="button" variant="outline" disabled={isLoading}>
                取消
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : saveAsNewVersion ? (
                <GitBranch className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saveAsNewVersion ? '保存新版本' : '更新提示词'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}