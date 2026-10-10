'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tab,
  Tabs
} from '@heroui/react'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { useUserStore } from '~/store/userStore'
import { ResourceInfo } from './ResourceInfo'
import { ResourceDownload } from './ResourceDownload'
import {
  RESOURCE_SECTION_MAP,
  SUPPORTED_RESOURCE_SECTION
} from '~/constants/resource'
import { KunPatchTab } from './kun/KunPatchTab'
import type { PatchResource } from '~/types/api/patch'
import styles from '~/components/patch/header/patch-detail.module.css'

type ResourceSection = (typeof SUPPORTED_RESOURCE_SECTION)[number]
type SectionKey = ResourceSection | 'kun'

interface Props {
  vndbId: string
  resources: PatchResource[]
  loading?: boolean
  toolbarAction?: ReactNode
  setEditResource: (resources: PatchResource) => void
  onOpenEdit: () => void
  onOpenDelete: () => void
  setDeleteResourceId: (resourceId: number) => void
}

export const ResourceTabs = ({
  vndbId,
  resources,
  loading = false,
  toolbarAction,
  setEditResource,
  onOpenEdit,
  onOpenDelete,
  setDeleteResourceId
}: Props) => {
  const { user } = useUserStore((state) => state)
  const [selectedSection, setSelectedSection] = useState<SectionKey>('galgame')
  const categorizedResources = SUPPORTED_RESOURCE_SECTION.reduce(
    (acc, section) => {
      acc[section] = resources.filter(
        (resource) => resource.section === section
      )
      return acc
    },
    {} as Record<ResourceSection, PatchResource[]>
  )

  const renderSection = (section: ResourceSection) => {
    if (loading) {
      return (
        <p className={styles.resourceEmpty}>正在获取 Galgame 资源数据...</p>
      )
    }

    const sectionResources = categorizedResources[section]
    if (sectionResources.length === 0) {
      return (
        <p className={styles.resourceEmpty}>
          本游戏暂无 {RESOURCE_SECTION_MAP[section]}
        </p>
      )
    }

    return (
      <div className={styles.resourceList}>
        {sectionResources.map((resource) => (
          <article key={resource.id} className={styles.resourceCard}>
            <div className={styles.resourceCardHead}>
              <ResourceInfo resource={resource} />
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="light"
                    isIconOnly
                    className={styles.resourceMenu}
                    aria-label="资源操作"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Resource actions"
                  disabledKeys={
                    user.uid !== resource.userId && user.role < 3
                      ? ['edit', 'delete']
                      : []
                  }
                >
                  <DropdownItem
                    key="edit"
                    startContent={<Edit className="size-4" />}
                    onPress={() => {
                      setEditResource(resource)
                      onOpenEdit()
                    }}
                  >
                    编辑
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    startContent={<Trash2 className="size-4" />}
                    onPress={() => {
                      setDeleteResourceId(resource.id)
                      onOpenDelete()
                    }}
                  >
                    删除
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
            <ResourceDownload resource={resource} />
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.resourceBody}>
      <Tabs
        aria-label="资源分类"
        selectedKey={selectedSection}
        onSelectionChange={(key) =>
          setSelectedSection(String(key) as SectionKey)
        }
        className={styles.sectionTabs}
        classNames={{ panel: styles.sectionPanel }}
      >
        {SUPPORTED_RESOURCE_SECTION.map((section) => (
          <Tab key={section} title={RESOURCE_SECTION_MAP[section]}>
            {renderSection(section)}
          </Tab>
        ))}
        {vndbId ? (
          <Tab key="kun" title="鲲补丁">
            <KunPatchTab vndbId={vndbId} />
          </Tab>
        ) : null}
      </Tabs>
      {toolbarAction}
    </div>
  )
}
