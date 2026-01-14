import { Input } from '@heroui/input'
import { Button } from '@heroui/react'
import { Search } from 'lucide-react'
import { KunLoading } from '~/components/kun/Loading'

interface SearchCompanyProps {
    query: string
    setQuery: (value: string) => void
    handleSearch: () => void
    searching: boolean
}

export const SearchCompany = ({
    query,
    setQuery,
    handleSearch,
    searching
}: SearchCompanyProps) => {
    return (
        <>
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="可以用空格分隔您的搜索关键字"
                endContent={
                    <Button
                        isIconOnly
                        variant="light"
                        aria-label="搜索制作会社"
                        onPress={handleSearch}
                    >
                        <Search />
                    </Button>
                }
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                }}
            />
            {searching && <KunLoading hint="正在搜索会社数据..." />}
        </>
    )
}
