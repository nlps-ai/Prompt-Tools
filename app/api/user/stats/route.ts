import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'

// GET /api/user/stats - Get user statistics
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

    // Get user's prompts
    const prompts = await FirebaseService.getPromptsByUserId(session.user.id, 1000)
    
    // Calculate total versions
    let totalVersions = 0
    for (const prompt of prompts) {
      const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
      totalVersions += versions.length
    }

    const stats = {
      totalPrompts: prompts.length,
      totalVersions,
      accountCreated: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('zh-CN') : '未知',
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}