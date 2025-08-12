'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
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
import { KunNull } from '~/components/kun/Null'
import type { PatchResource } from '~/types/api/patch'

type ResourceSection = (typeof SUPPORTED_RESOURCE_SECTION)[number]

interface Props {
  vndbId: string
  resources: PatchResource[]
  setEditResource: (resources: PatchResource) => void
  onOpenEdit: () => void
  onOpenDelete: () => void
  setDeleteResourceId: (resourceId: number) => void
}

export const ResourceTabs = ({
  vndbId,
  resources,
  setEditResource,
  onOpenEdit,
  onOpenDelete,
  setDeleteResourceId
}: Props) => {
  const { user } = useUserStore((state) => state)

  const [selectedSection, setSelectedSection] =
    useState<ResourceSection>('galgame')
  const categorizedResources = SUPPORTED_RESOURCE_SECTION.reduce(
    (acc, section) => {
      acc[section] = resources.filter(
        (resource) => resource.section === section
      )
      return acc
    },
    {} as Record<ResourceSection, PatchResource[]>
  )

  return (
    <Tabs
      selectedKey={selectedSection}
      onSelectionChange={(key) => setSelectedSection(key as ResourceSection)}
      className="mb-4"
    >
      {SUPPORTED_RESOURCE_SECTION.map((section) => (
        <Tab
          key={section}
          title={RESOURCE_SECTION_MAP[section]}
          className="w-full"
        >
          <div className="space-y-4">
            {categorizedResources[section].length > 0 ? (
              categorizedResources[section].map((resource) => (
                <Card key={resource.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between">
                      <ResourceInfo resource={resource} />

                      <Dropdown>
                        <DropdownTrigger>
                          <Button variant="light" isIconOnly>
                            <MoreHorizontal
                              aria-label="资源操作"
                              className="size-4"
                            />
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
                  </CardBody>
                </Card>
              ))
            ) : (
              <KunNull
                message={`本游戏暂无 ${RESOURCE_SECTION_MAP[section]}`}
              />
            )}
          </div>
        </Tab>
      ))}

      {vndbId && (
        <Tab title="鲲补丁" className="w-full">
          <KunPatchTab key="moyu-moe" vndbId={vndbId} />
        </Tab>
      )}
    </Tabs>
  )
}
