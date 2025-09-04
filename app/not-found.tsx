'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileQuestion,
  Home,
  ArrowLeft,
  Search,
} from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-6" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            页面未找到
          </h1>
          
          <p className="text-muted-foreground mb-6 max-w-sm">
            抱歉，您访问的页面不存在或已被移动。请检查网址是否正确，或返回首页继续浏览。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link href="/dashboard" className="flex-1">
              <Button variant="default" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回上页
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p>常用页面：</p>
            <div className="flex flex-col gap-1 mt-2">
              <Link href="/dashboard" className="hover:text-primary transition-colors">
                • 仪表盘
              </Link>
              <Link href="/dashboard/prompts" className="hover:text-primary transition-colors">
                • 我的提示词
              </Link>
              <Link href="/dashboard/prompts/new" className="hover:text-primary transition-colors">
                • 创建提示词
              </Link>
              <Link href="/dashboard/settings" className="hover:text-primary transition-colors">
                • 账户设置
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}