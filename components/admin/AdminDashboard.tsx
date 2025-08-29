'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Divider } from '@heroui/react'
import { Users, MessageSquare, FileText, Pin, TrendingUp, Settings } from 'lucide-react'
import { useRouter } from '@bprogress/next'
import { kunFetchGet } from '~/utils/kunFetch'
import type { OverviewData } from '~/types/api/admin'

export const AdminDashboard = () => {
  const [stats, setStats] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await kunFetchGet<OverviewData>('/api/admin/stats?days=7')
        setStats(response)
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg text-red-500">加载统计数据失败</div>
      </div>
    )
  }

  const statCards = [
    {
      title: '新增用户',
      value: stats.newUser,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: '活跃用户',
      value: stats.newActiveUser,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: '新增Galgame',
      value: stats.newGalgame,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: '新增资源',
      value: stats.newGalgameResource,
      icon: Settings,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: '新增评论',
      value: stats.newComment,
      icon: MessageSquare,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      title: '新增话题',
      value: stats.newTopic,
      icon: MessageSquare,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50'
    }
  ]

  const topicStats = [
    {
      title: '话题总数',
      value: stats.totalTopics,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      title: '置顶话题',
      value: stats.pinnedTopics,
      icon: Pin,
      color: 'text-yellow-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">管理面板</h1>
        <p className="text-gray-600">查看网站统计数据和管理功能</p>
      </div>

      {/* 统计卡片 - 过去7天数据 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">过去7天统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardBody className="flex flex-row items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <IconComponent className={`size-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 话题统计 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">话题统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topicStats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardBody className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <IconComponent className={`size-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* 管理功能导航 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">管理功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" isPressable onPress={() => router.push('/admin/topic')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <MessageSquare className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">话题管理</h3>
                  <p className="text-sm text-gray-600">管理话题置顶状态</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" isPressable onPress={() => router.push('/admin/user')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Users className="size-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">用户管理</h3>
                  <p className="text-sm text-gray-600">管理用户权限和状态</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" isPressable onPress={() => router.push('/admin/galgame')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <FileText className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Galgame管理</h3>
                  <p className="text-sm text-gray-600">管理游戏和资源</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}