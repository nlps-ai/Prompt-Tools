import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
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

    const where: any = {
      userId: session.user.id,
    }

    // 搜索功能
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { tags: { hasSome: query.search.split(' ') } },
      ]
    }

    // 标签筛选
    if (query.tags) {
      const tagArray = query.tags.split(',').filter(Boolean)
      where.tags = { hasSome: tagArray }
    }

    // 置顶筛选
    if (query.pinned !== undefined) {
      where.pinned = query.pinned
    }

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          currentVersion: {
            select: {
              version: true,
              content: true,
            },
          },
          _count: {
            select: {
              versions: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.prompt.count({ where }),
    ])

    return NextResponse.json({
      prompts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
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

    // 开始事务
    const result = await prisma.$transaction(async (tx) => {
      // 创建 prompt
      const prompt = await tx.prompt.create({
        data: {
          ...validatedData,
          userId: session.user!.id,
        },
      })

      // 创建初始版本
      const version = await tx.version.create({
        data: {
          promptId: prompt.id,
          version: '1.0.0',
          content: validatedData.content,
        },
      })

      // 更新 prompt 的当前版本 ID
      const updatedPrompt = await tx.prompt.update({
        where: { id: prompt.id },
        data: { currentVersionId: version.id },
        include: {
          currentVersion: true,
          _count: {
            select: {
              versions: true,
            },
          },
        },
      })

      return updatedPrompt
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