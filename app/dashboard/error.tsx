'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
} from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl">页面加载失败</CardTitle>
            <CardDescription>
              抱歉，当前页面遇到了错误。请尝试刷新页面或返回首页。
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-semibold text-red-800 mb-1 flex items-center text-sm">
                  <Bug className="mr-1 h-3 w-3" />
                  错误详情
                </h4>
                <p className="text-xs text-red-600 font-mono break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-500 mt-1">
                    ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex gap-3">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}