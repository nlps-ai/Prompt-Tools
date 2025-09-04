import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

interface RouteContext {
  params: {
    id: string
  }
}

// 更新 Prompt 的验证 Schema
const updatePromptSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
  content: z.string().min(1, '内容不能为空'),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  saveAsVersion: z.boolean().default(false),
  versionType: z.enum(['patch', 'minor', 'major']).default('patch'),
})

// 版本号处理函数
function bumpVersion(currentVersion: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = currentVersion.split('.').map(Number)
  if (parts.length !== 3) return '1.0.0'

  const [major, minor, patch] = parts

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

// GET /api/prompts/[id] - 获取特定 prompt
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const prompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5, // 只返回最近5个版本
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
    })

    if (!prompt) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    return NextResponse.json(prompt)
  } catch (error) {
    console.error('获取 prompt 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT /api/prompts/[id] - 更新 prompt
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePromptSchema.parse(body)

    // 验证 prompt 所有权
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        currentVersion: true,
      },
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 更新基本信息
      let updatedPrompt = await tx.prompt.update({
        where: { id: params.id },
        data: {
          name: validatedData.name,
          source: validatedData.source,
          notes: validatedData.notes,
          tags: validatedData.tags,
        },
      })

      // 如果需要保存为新版本
      if (validatedData.saveAsVersion) {
        const currentVersion = existingPrompt.currentVersion?.version || '1.0.0'
        const newVersion = bumpVersion(currentVersion, validatedData.versionType)

        // 创建新版本
        const version = await tx.version.create({
          data: {
            promptId: params.id,
            version: newVersion,
            content: validatedData.content,
            parentVersionId: existingPrompt.currentVersionId,
          },
        })

        // 更新当前版本 ID
        updatedPrompt = await tx.prompt.update({
          where: { id: params.id },
          data: { currentVersionId: version.id },
        })
      } else {
        // 仅更新当前版本内容
        if (existingPrompt.currentVersionId) {
          await tx.version.update({
            where: { id: existingPrompt.currentVersionId },
            data: { content: validatedData.content },
          })
        }
      }

      // 获取完整的更新后数据
      return tx.prompt.findUnique({
        where: { id: params.id },
        include: {
          currentVersion: true,
          _count: {
            select: {
              versions: true,
            },
          },
        },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据无效', details: error.errors },
        { status: 400 }
      )
    }

    console.error('更新 prompt 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// DELETE /api/prompts/[id] - 删除 prompt
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证 prompt 所有权
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    // 删除 prompt（级联删除版本）
    await prisma.prompt.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除 prompt 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}