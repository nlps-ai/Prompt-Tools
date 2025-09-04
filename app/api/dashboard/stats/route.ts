import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FirebaseService } from '@/lib/firebase'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/stats - 获取仪表盘统计数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // Get user's prompts
    const prompts = await FirebaseService.getPromptsByUserId(session.user.id, 1000)
    
    // Calculate stats
    const totalPrompts = prompts.length
    const pinnedPrompts = prompts.filter(prompt => prompt.pinned).length
    
    // Get total versions count by fetching versions for all prompts
    let totalVersions = 0
    for (const prompt of prompts) {
      const versions = await FirebaseService.getVersionsByPromptId(prompt.id)
      totalVersions += versions.length
    }

    // Calculate recent activity (last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentActivity = prompts.filter(prompt => 
      new Date(prompt.updatedAt) >= oneWeekAgo
    ).length

    const stats = {
      totalPrompts,
      pinnedPrompts,
      totalVersions,
      recentActivity,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('获取仪表盘统计失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}