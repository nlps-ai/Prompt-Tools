import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'

// 创建 Prompt 的验证 Schema
const createPromptSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
  content: z.string().min(1, '内容不能为空'),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

// 查询参数 Schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
  pinned: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/prompts - 获取用户的所有 prompts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    let prompts = []

    // 获取用户的所有 prompts
    if (query.search || query.tags) {
      // 使用搜索功能
      const tags = query.tags ? query.tags.split(',').filter(Boolean) : undefined
      prompts = await FirebaseService.searchPrompts(
        session.user.id,
        query.search || '',
        tags,
        query.limit
      )
    } else {
      // 获取所有 prompts
      prompts = await FirebaseService.getPromptsByUserId(
        session.user.id,
        query.limit
      )
    }

    // 筛选置顶状态
    if (query.pinned !== undefined) {
      prompts = prompts.filter(prompt => prompt.pinned === query.pinned)
    }

    // 排序
    prompts.sort((a, b) => {
      const aValue = a[query.sortBy as keyof typeof a]
      const bValue = b[query.sortBy as keyof typeof b]
      
      if (query.sortBy === 'name') {
        return query.sortOrder === 'asc' 
          ? (aValue as string).localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue as string)
      } else {
        const aTime = (aValue as Date).getTime()
        const bTime = (bValue as Date).getTime()
        return query.sortOrder === 'asc' ? aTime - bTime : bTime - aTime
      }
    })

    // 获取每个 prompt 的版本信息
    const promptsWithVersions = await Promise.all(
      prompts.map(async (prompt) => {
        const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
        const currentVersion = versions.find(v => v.id === prompt.currentVersionId) || versions[0]
        
        return {
          ...prompt,
          currentVersion: currentVersion ? {
            version: currentVersion.version,
            content: currentVersion.content,
          } : null,
          _count: {
            versions: versions.length,
          },
        }
      })
    )

    // 分页处理
    const startIndex = (query.page - 1) * query.limit
    const endIndex = startIndex + query.limit
    const paginatedPrompts = promptsWithVersions.slice(startIndex, endIndex)

    return NextResponse.json({
      prompts: paginatedPrompts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: promptsWithVersions.length,
        pages: Math.ceil(promptsWithVersions.length / query.limit),
      },
    })
  } catch (error) {
    console.error('获取 prompts 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/prompts - 创建新的 prompt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPromptSchema.parse(body)

    // 创建 prompt
    const prompt = await FirebaseService.createPrompt({
      name: validatedData.name,
      source: validatedData.source,
      notes: validatedData.notes,
      tags: validatedData.tags,
      pinned: false,
      userId: session.user.id,
    })

    // 创建初始版本
    const version = await FirebaseService.createVersion(prompt.id, {
      version: '1.0.0',
      content: validatedData.content,
    })

    // 更新 prompt 的当前版本 ID
    const updatedPrompt = await FirebaseService.updatePrompt(prompt.id, {
      currentVersionId: version.id,
    })

    // 获取版本信息用于返回
    const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
    const currentVersion = versions.find(v => v.id === version.id)

    const result = {
      ...updatedPrompt,
      currentVersion: currentVersion ? {
        version: currentVersion.version,
        content: currentVersion.content,
      } : null,
      _count: {
        versions: versions.length,
      },
    }

    // 记录审计日志
    await FirebaseService.logAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'PROMPT',
      entityId: prompt.id,
      newData: validatedData,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据无效', details: error.errors },
        { status: 400 }
      )
    }

    console.error('创建 prompt 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}