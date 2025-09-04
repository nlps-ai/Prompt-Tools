import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'

// GET /api/user/export - Export all user data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // Get user data
    const userData = await FirebaseService.getUserById(session.user.id)
    if (!userData) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Get all user's prompts
    const prompts = await FirebaseService.getPromptsByUserId(session.user.id, 1000)
    
    // Get all versions for each prompt
    const promptsWithVersions = await Promise.all(
      prompts.map(async (prompt) => {
        const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
        return {
          ...prompt,
          versions: versions.map(version => ({
            id: version.id,
            version: version.version,
            content: version.content,
            createdAt: version.createdAt,
          })),
        }
      })
    )

    // Prepare export data
    const exportData = {
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        name: userData.name,
        bio: userData.bio,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      prompts: promptsWithVersions.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        source: prompt.source,
        notes: prompt.notes,
        tags: prompt.tags,
        pinned: prompt.pinned,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
        currentVersionId: prompt.currentVersionId,
        versions: prompt.versions,
      })),
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    }

    // Return JSON file
    const response = NextResponse.json(exportData)
    response.headers.set('Content-Disposition', `attachment; filename="prompts-export-${new Date().toISOString().split('T')[0]}.json"`)
    response.headers.set('Content-Type', 'application/json')

    return response
  } catch (error) {
    console.error('导出用户数据失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}