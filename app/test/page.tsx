'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function TestPage() {
  const { data: session } = useSession()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    const testAPI = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/prompts?limit=5')
        if (response.ok) {
          const result = await response.json()
          setData(result)
        } else {
          const err = await response.json()
          setError(err)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    testAPI()
  }, [session])

  if (!session) {
    return <div>请先登录</div>
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Firebase查询测试</h1>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">错误:</h3>
          <pre className="text-red-600 text-sm mt-2">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h3 className="font-semibold text-green-800">成功获取数据:</h3>
          <pre className="text-green-600 text-sm mt-2">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}