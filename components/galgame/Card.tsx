'use client'

import { useState } from 'react'
import { Image } from '@heroui/image'
import { KunCardStats } from '~/components/kun/CardStats'
import { Card, CardBody, CardFooter, CardHeader } from '@heroui/card'
import Link from 'next/link'
import { KunPatchAttribute } from '~/components/kun/PatchAttribute'
import { cn } from '~/utils/cn'

interface Props {
  patch: GalgameCard & { size?: string }
}

export const GalgameCard = ({ patch }: Props) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  // @ts-ignore
  const displaySize = patch.resources?.[0]?.size || null

  return (
    <Card
      isPressable
      as={Link}
      href={`/${patch.uniqueId}`}
      className="flex flex-col gap-2 p-2 transition-shadow border shadow-sm rounded-xl group border-divider hover:shadow-lg"
    >
      {/* 封面图容器 */}
      <div className="relative w-full overflow-hidden rounded-lg aspect-[3/4]">
        {/* 加载时的骨架屏 */}
        <div
          className={cn(
            'absolute inset-0 bg-default-200 animate-pulse',
            imageLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
        <Image
          radius="none"
          alt={patch.name}
          className={cn(
            'w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          removeWrapper
          src={
            patch.banner
              ? patch.banner.replace(/\.avif$/, '-mini.avif')
              : '/touchgal.avif'
          }
          onLoad={() => setImageLoaded(true)}
        />

        {/* 右上角的文件大小 */}
        {displaySize && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-black/60 rounded-md backdrop-blur-sm">
            {displaySize}
          </div>
        )}
      </div>

      {/* 封面图下方的信息 */}
      <div className="flex flex-col gap-1 px-1">
        <h2
          className="font-semibold text-sm transition-colors truncate text-foreground/90 group-hover:text-primary"
          title={patch.name}
        >
          {patch.name}
        </h2>
        
        <KunCardStats patch={patch} isMobile />
        <CardFooter className="pt-0">
          <KunPatchAttribute types={patch.type} size="sm" />
        </CardFooter>
      </div>
    </Card>
  )
}