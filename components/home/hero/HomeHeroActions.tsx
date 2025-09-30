'use client'

import { Tooltip } from '@heroui/tooltip'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { RandomGalgameButton } from '../carousel/RandomGalgameButton'
import { Telegram } from '~/components/kun/icons/Telegram'

interface HomeHeroActionsProps {
  telegramHref: string
}

export const HomeHeroActions = ({ telegramHref }: HomeHeroActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <RandomGalgameButton color="primary" variant="solid">
        随机一部游戏
      </RandomGalgameButton>
      <Tooltip showArrow content="Telegram 服务器">
        <Button
          isIconOnly
          isExternal
          as={Link}
          href={telegramHref}
          variant="flat"
          color="secondary"
        >
          <Telegram />
        </Button>
      </Tooltip>
    </div>
  )
}
