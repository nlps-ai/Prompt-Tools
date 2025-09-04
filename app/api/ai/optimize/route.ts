import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'

// 输入验证 Schema
const optimizeSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  optimizationType: z.enum(['structure', 'clarity', 'effectiveness']).default('structure'),
  language: z.enum(['zh', 'en']).default('zh'),
})

// 智谱AI API 调用
async function callZhipuAI(prompt: string, optimizationType: string): Promise<string> {
  const API_KEY = process.env.ZHIPU_AI_KEY
  if (!API_KEY) {
    throw new Error('未配置智谱AI API密钥')
  }

  const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

  const systemPrompts = {
    structure: `# 角色 (Role)
你是一位专业的提示词结构优化专家，擅长运用RTF（Role-Task-Format）框架重构提示词。

# 任务 (Task)
根据用户提供的原始提示词，生成一套结构化优化的中文提示词。

## 要求 (Requirements)
1. 严格按照RTF（Role-Task-Format）结构化框架重构提示词
2. 遵循奥卡姆剃刀原理，确保提示词精简高效
3. 应用金字塔原理组织指令，确保逻辑清晰、层次分明
4. 确保优化后的提示词具有更好的可执行性

# 格式 (Format)
直接返回优化后的提示词，不要添加额外的解释`,

    clarity: `# 角色 (Role)
你是一位专业的文本清晰度优化专家，专注于提升提示词的表达清晰度和易理解性。

# 任务 (Task)
优化提示词的表达方式，使其更加清晰易懂，减少歧义。

## 要求 (Requirements)
1. 简化复杂句式，使用简洁明了的表达
2. 消除模糊表述，使用具体明确的词汇
3. 优化逻辑结构，确保思路清晰
4. 保持原意不变，仅优化表达方式

# 格式 (Format)
直接返回优化后的提示词，不要添加额外的解释`,

    effectiveness: `# 角色 (Role)
你是一位AI提示词效果优化专家，专注于提升提示词与AI模型的交互效果。

# 任务 (Task)  
优化提示词以获得更好的AI响应效果和准确性。

## 要求 (Requirements)
1. 增强指令的具体性和可操作性
2. 添加必要的约束条件和输出规范
3. 优化提示词以减少AI的误解
4. 确保提示词能引导AI给出高质量回复

# 格式 (Format)
直接返回优化后的提示词，不要添加额外的解释`
  }

  const requestBody = {
    model: 'glm-4.5-flash',
    messages: [
      {
        role: 'system',
        content: systemPrompts[optimizationType as keyof typeof systemPrompts]
      },
      {
        role: 'user',
        content: `请优化以下提示词：\n\n${prompt}`
      }
    ],
    temperature: 0.6,
    stream: false
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API请求失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content.trim()
  } else {
    throw new Error('API返回数据格式错误')
  }
}

// POST /api/ai/optimize - AI 优化提示词
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const { content, optimizationType, language } = optimizeSchema.parse(body)

    // 调用智谱AI进行优化
    const optimizedContent = await callZhipuAI(content, optimizationType)

    return NextResponse.json({
      original: content,
      optimized: optimizedContent,
      optimizationType,
      language,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据无效', details: error.errors },
        { status: 400 }
      )
    }

    console.error('AI优化失败:', error)
    
    // 根据错误类型返回不同信息
    if (error instanceof Error) {
      if (error.message.includes('API请求失败')) {
        return NextResponse.json({ error: 'AI服务暂时不可用，请稍后重试' }, { status: 503 })
      }
      if (error.message.includes('未配置')) {
        return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: '优化服务异常，请稍后重试' }, { status: 500 })
  }
}