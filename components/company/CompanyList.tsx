import { KunMasonryGrid } from '~/components/kun/MasonryGrid'
import { CompanyCard } from './Card'
import { KunNull } from '~/components/kun/Null'
import { KunLoading } from '~/components/kun/Loading'
import type { Company } from '~/types/api/company'
import { useSettingStore } from '~/store/settingStore'

interface CompanyListProps {
    companies: Company[]
    loading: boolean
    searching: boolean
}

export const CompanyList = ({ companies, loading, searching }: CompanyListProps) => {
    const settings = useSettingStore((state) => state.data)
    const isNSFWEnabled =
        settings.kunNsfwEnable === 'nsfw' || settings.kunNsfwEnable === 'all'

    if (loading) {
        return <KunLoading hint="正在获取会社数据..." />
    }

    if (!searching && companies.length === 0) {
        return (
            <KunNull
                message={
                    isNSFWEnabled
                        ? '您已启用显示 NSFW 内容, 但未找到相关内容, 请尝试使用游戏的日文原名搜索'
                        : '未找到相关内容, 请尝试使用游戏的日文原名搜索或打开 NSFW'
                }
            />
        )
    }

    return (
        <KunMasonryGrid columnWidth={256} gap={16}>
            {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
            ))}
        </KunMasonryGrid>
    )
}
