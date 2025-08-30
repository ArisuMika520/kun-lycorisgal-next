import { Button } from '@heroui/button'
import { Tooltip } from '@heroui/tooltip'
import { Link } from '@heroui/link'
import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Sparkles } from 'lucide-react'
import { KunCarousel } from '../carousel/KunCarousel'
import { RandomGalgameButton } from '../carousel/RandomGalgameButton'
import { Discord } from '~/components/kun/icons/Discord'
import { Telegram } from '~/components/kun/icons/Telegram'
import { KunHomeNavigationItems } from '../NavigationItems'
import { kunMoyuMoe } from '~/config/moyu-moe'
import type { HomeCarouselMetadata } from '../carousel/mdx'

interface HomeHeroProps {
  posts?: HomeCarouselMetadata[]
}

export const HomeHero = ({ posts = [] }: HomeHeroProps) => {

  return (
    <div className="w-full mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6 min-h-[300px]">
        <div className="flex-col justify-center hidden space-y-2 sm:flex sm:space-y-6">
          <Card className="h-full border-none bg-gradient-to-br from-red-400/20 via-orange-400/20 to-pink-500/20">
            <CardBody className="flex justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <Chip color="primary" variant="flat">
                  欢迎来到 LyCorisGal
                </Chip>
              </div>

              <div className="space-y-4">
                <h1 className="py-1 text-3xl font-bold text-transparent xl:text-4xl bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text">
                  Gal引导资源站
                </h1>
                <p className="text-md text-default-600">
                  简单  轻松  迅速
                </p>
              </div>

              <div className="flex items-center gap-2">
                <RandomGalgameButton color="primary" variant="solid">
                  随机一部游戏
                </RandomGalgameButton>
                <Tooltip showArrow content="Telegram 服务器">
                  <Button
                    isIconOnly
                    isExternal
                    as={Link}
                    href={kunMoyuMoe.domain.telegram_group}
                    variant="flat"
                    color="secondary"
                  >
                    <Telegram />
                  </Button>
                </Tooltip>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <KunHomeNavigationItems buttonSize="lg" />
          </div>
        </div>

        <KunCarousel posts={posts} />
      </div>
    </div>
  )
}
