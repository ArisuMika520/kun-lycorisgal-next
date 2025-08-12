'use client'

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from '@heroui/dropdown'
import { Button } from '@heroui/button'
import { Card, CardHeader } from '@heroui/card'
import { ChevronDown } from 'lucide-react'
import type { SortField } from './_sort'

interface Props {
  sortField: SortField
  setSortField: (option: SortField) => void
}

const sortFieldLabelMap: Record<string, string> = {
  resource_update_time: '资源更新时间',
  created: '游戏创建时间',
  view: '浏览量',
  download: '下载量'
}

export const FilterBar = ({ sortField, setSortField }: Props) => {
  return (
    <Card className="w-full border border-default-100 bg-content1/50 backdrop-blur-lg">
      <CardHeader>
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="flat"
              style={{
                fontSize: '0.875rem'
              }}
              endContent={<ChevronDown className="size-4" />}
              radius="lg"
              size="lg"
            >
              {sortFieldLabelMap[sortField]}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="排序选项"
            selectedKeys={new Set([sortField])}
            onAction={(key) => setSortField(key as SortField)}
            selectionMode="single"
            className="min-w-[120px]"
          >
            <DropdownItem
              key="resource_update_time"
              className="text-default-700"
            >
              资源更新时间
            </DropdownItem>
            <DropdownItem key="created" className="text-default-700">
              游戏创建时间
            </DropdownItem>
            <DropdownItem key="view" className="text-default-700">
              浏览量
            </DropdownItem>
            <DropdownItem key="download" className="text-default-700">
              下载量
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>
    </Card>
  )
}
