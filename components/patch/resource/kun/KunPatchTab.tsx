'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardBody, Image, Link } from '@heroui/react'
import { KunResourceInfo } from './KunResourceInfo'
import { KunResourceDownload } from './KunResourceDownload'
import { KunLoading } from '~/components/kun/Loading'
import { KunNull } from '~/components/kun/Null'
import type {
  HikariResponse,
  KunPatchResourceResponse
} from '~/types/api/kun/moyu-moe'

const KUN_PATCH_WEBSITE_ENDPOINT = `https://www.moyu.moe/api/hikari`

interface Props {
  vndbId: string
}

export const KunPatchTab = ({ vndbId }: Props) => {
  const [isPending, startTransition] = useTransition()

  const [resources, setResources] = useState<KunPatchResourceResponse[]>([])

  const fetchData = async () => {
    if (!vndbId) {
      return
    }

    startTransition(async () => {
      const res = await fetch(`${KUN_PATCH_WEBSITE_ENDPOINT}?vndb_id=${vndbId}`)
      const response = (await res.json()) as HikariResponse
      if (response.success && response.data) {
        setResources(response.data.resource)
      }
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <>
      {isPending ? (
        <KunLoading hint="正在从鲲 Galgame 补丁获取数据..." />
      ) : (
        <div className="space-y-4">
          {resources.length ? (
            <>
              {resources.map((resource) => (
                <Card key={resource.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between">
                      <KunResourceInfo resource={resource} />
                    </div>

                    <KunResourceDownload resource={resource} />
                  </CardBody>
                </Card>
              ))}

              <div className="flex flex-wrap justify-center text-default-500">
                <span>补丁数据由</span>
                <Link
                  href="https://www.moyu.moe"
                  target="_blank"
                  size="sm"
                  className="gap-1 mx-1"
                >
                  <Image
                    src="/moyu-moe.webp"
                    alt="鲲 Galgame 补丁 Logo"
                    width={20}
                    height={20}
                  />
                  鲲 Galgame 补丁
                </Link>
                <span>提供</span>
              </div>
            </>
          ) : (
            <KunNull message="本游戏在鲲 Galgame 补丁暂无对应补丁" />
          )}
        </div>
      )}
    </>
  )
}
