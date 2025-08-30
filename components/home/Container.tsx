'use client'

import { Button } from '@heroui/button'
import { ChevronRight } from 'lucide-react'
import { GalgameCard } from '~/components/galgame/Card'
import { ResourceCard } from '~/components/resource/ResourceCard'
import { TopicCard } from '~/components/topic/TopicCard'
import Link from 'next/link'
import { HomeHero } from './hero/HomeHero'
import { HomeBannerRowAd } from '~/components/ads/AdInterface'

import type { HomeResource } from '~/types/api/home'
import type { TopicCard as TopicCardType } from '~/types/api/topic'

interface Props {
  galgames: GalgameCard[]
  resources: HomeResource[]
  topics: TopicCardType[]
  posts?: any[] // 轮播图数据
}

export const HomeContainer = ({ galgames, resources, topics, posts }: Props) => {

  return (
    <div className="mx-auto space-y-8 max-w-7xl">
      <HomeHero posts={posts} />
      
      {/* 首页横幅广告 */}
      <HomeBannerRowAd />
      
      <section className="space-y-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold sm:text-2xl">最新话题</h2>
          <Button
            variant="light"
            as={Link}
            color="primary"
            endContent={<ChevronRight className="size-4" />}
            href="/topic"
          >
            查看更多
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold sm:text-2xl">最新 Galgame</h2>
          <Button
            variant="light"
            as={Link}
            color="primary"
            endContent={<ChevronRight className="size-4" />}
            href="/galgame"
          >
            查看更多
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 xl:grid-cols-6">
          {galgames.map((galgame) => (
            <GalgameCard key={galgame.id} patch={galgame} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold sm:text-2xl">最新补丁资源下载</h2>
          <Button
            variant="light"
            as={Link}
            color="primary"
            endContent={<ChevronRight className="size-4" />}
            href="/resource"
          >
            查看更多
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-6 md:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>
    </div>
  )
}
