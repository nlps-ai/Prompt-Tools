'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Mail,
} from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">出现了错误</CardTitle>
          <CardDescription>
            抱歉，应用程序遇到了意外错误。请尝试刷新页面或稍后再试。
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                <Bug className="mr-2 h-4 w-4" />
                调试信息
              </h4>
              <p className="text-sm text-red-600 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-500 mt-2">
                  错误ID: {error.digest}
                </p>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
            
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>
          
          {/* Contact support */}
          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            <p className="mb-2">如果问题持续存在，请联系技术支持</p>
            <div className="flex justify-center">
              <Button variant="link" size="sm" className="text-xs">
                <Mail className="mr-1 h-3 w-3" />
                报告问题
              </Button>
            </div>
          </div>
          
          {/* Common actions */}
          <div className="pt-2 text-center">
            <p className="text-sm text-muted-foreground mb-2">或者访问：</p>
            <div className="flex flex-col gap-1 text-xs">
              <Link href="/dashboard" className="hover:text-primary transition-colors">
                • 仪表盘
              </Link>
              <Link href="/dashboard/prompts" className="hover:text-primary transition-colors">
                • 我的提示词
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