import { Tab, Tabs } from '@heroui/tabs'
import { IntroductionTab } from '~/components/patch/introduction/IntroductionTab'
import { ResourceTab } from '~/components/patch/resource/ResourceTab'
import { CommentTab } from '~/components/patch/comment/CommentTab'
import type { PatchIntroduction } from '~/types/api/patch'
import type { Dispatch, SetStateAction } from 'react'

interface PatchHeaderProps {
  id: number
  uniqueId: string
  vndbId: string
  uid?: number
  intro: PatchIntroduction
  selected: string
  setSelected: Dispatch<SetStateAction<string>>
}

export const PatchHeaderTabs = ({
  id,
  uniqueId,
  vndbId,
  uid,
  intro,
  selected,
  setSelected
}: PatchHeaderProps) => {
  return (
    <Tabs
      className="w-full my-6 overflow-hidden shadow-medium rounded-large"
      fullWidth={true}
      defaultSelectedKey="introduction"
      onSelectionChange={(value) => {
        if (value === 'resources') {
          window.scroll(0, 400)
        }
        setSelected(value.toString())
      }}
      selectedKey={selected}
    >
      <Tab key="introduction" title="游戏信息" className="p-0">
        <IntroductionTab intro={intro} patchId={Number(id)} uniqueId={uniqueId} uid={uid} />
      </Tab>

      <Tab key="resources" title="资源链接" className="p-0">
        <ResourceTab id={id} vndbId={vndbId} />
      </Tab>

      <Tab key="comments" title="游戏评论" className="p-0">
        <CommentTab id={id} />
      </Tab>
    </Tabs>
  )
}
