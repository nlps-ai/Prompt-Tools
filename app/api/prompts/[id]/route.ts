import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { FirebaseService } from '@/lib/firebase'
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

    const prompt = await FirebaseService.getPromptById(params.id)
    
    if (!prompt || prompt.userId !== session.user.id) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    // 获取版本信息
    const versions = await FirebaseService.getVersionsByPromptId(params.id)
    const currentVersion = versions.find(v => v.id === prompt.currentVersionId) || versions[0]
    
    // 只返回最近5个版本
    const recentVersions = versions.slice(0, 5)

    const result = {
      ...prompt,
      currentVersion,
      versions: recentVersions,
      _count: {
        versions: versions.length,
      },
    }

    return NextResponse.json(result)
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
    const existingPrompt = await FirebaseService.getPromptById(params.id)
    if (!existingPrompt || existingPrompt.userId !== session.user.id) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    // 获取当前版本信息
    const versions = await FirebaseService.getVersionsByPromptId(params.id)
    const currentVersion = versions.find(v => v.id === existingPrompt.currentVersionId) || versions[0]

    // 保存旧数据用于审计
    const oldData = {
      name: existingPrompt.name,
      source: existingPrompt.source,
      notes: existingPrompt.notes,
      tags: existingPrompt.tags,
      content: currentVersion?.content,
    }

    let newVersionId = existingPrompt.currentVersionId

    // 如果需要保存为新版本
    if (validatedData.saveAsVersion) {
      const currentVersionString = currentVersion?.version || '1.0.0'
      const newVersionString = bumpVersion(currentVersionString, validatedData.versionType)

      // 创建新版本
      const newVersion = await FirebaseService.createVersion(params.id, {
        version: newVersionString,
        content: validatedData.content,
        parentVersionId: existingPrompt.currentVersionId,
      })
      
      newVersionId = newVersion.id
    } else {
      // 仅更新当前版本内容
      if (existingPrompt.currentVersionId) {
        // 由于Firebase中版本是子集合，我们需要直接更新文档
        const { adminDb, collections } = await import('@/lib/firebase')
        await adminDb
          .collection(collections.prompts)
          .doc(params.id)
          .collection(collections.versions)
          .doc(existingPrompt.currentVersionId)
          .update({
            content: validatedData.content,
          })
      }
    }

    // 更新基本信息
    const updatedPrompt = await FirebaseService.updatePrompt(params.id, {
      name: validatedData.name,
      source: validatedData.source,
      notes: validatedData.notes,
      tags: validatedData.tags,
      currentVersionId: newVersionId,
    })

    if (!updatedPrompt) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    // 获取完整的更新后数据
    const updatedVersions = await FirebaseService.getVersionsByPromptId(params.id)
    const updatedCurrentVersion = updatedVersions.find(v => v.id === updatedPrompt.currentVersionId)

    const result = {
      ...updatedPrompt,
      currentVersion: updatedCurrentVersion,
      _count: {
        versions: updatedVersions.length,
      },
    }

    // 记录审计日志
    await FirebaseService.logAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'PROMPT',
      entityId: params.id,
      oldData,
      newData: validatedData,
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
    const existingPrompt = await FirebaseService.getPromptById(params.id)
    if (!existingPrompt || existingPrompt.userId !== session.user.id) {
      return NextResponse.json({ error: '找不到该 Prompt' }, { status: 404 })
    }

    // 删除 prompt（包括所有版本）
    await FirebaseService.deletePrompt(params.id)

    // 记录审计日志
    await FirebaseService.logAction({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'PROMPT',
      entityId: params.id,
      oldData: existingPrompt,
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除 prompt 失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}