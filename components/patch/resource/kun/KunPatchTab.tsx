'use client'

import { useEffect, useState, useTransition } from 'react'
import { Image } from '@heroui/react'
import { KunResourceInfo } from './KunResourceInfo'
import { KunResourceDownload } from './KunResourceDownload'
import styles from '~/components/patch/header/patch-detail.module.css'
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
        <p className={styles.resourceEmpty}>正在从鲲 Galgame 补丁获取数据...</p>
      ) : resources.length ? (
        <div className={styles.resourceList}>
          {resources.map((resource) => (
            <article key={resource.id} className={styles.resourceCard}>
              <KunResourceInfo resource={resource} />
              <KunResourceDownload resource={resource} />
            </article>
          ))}

          <p className={styles.resourceCredit}>
            <span>补丁数据由</span>
            <a
              className={styles.textLink}
              href="https://www.moyu.moe"
              target="_blank"
              rel="noreferrer"
            >
              <Image src="/moyu-moe.webp" alt="" width={20} height={20} />鲲
              Galgame 补丁
            </a>
            <span>提供</span>
          </p>
        </div>
      ) : (
        <p className={styles.resourceEmpty}>
          本游戏在鲲 Galgame 补丁暂无对应补丁
        </p>
      )}
    </>
  )
}
