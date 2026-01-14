import Link from 'next/link'
import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import type { Company } from '~/types/api/company'

interface Props {
    company: Company
}

export const CompanyCard = ({ company }: Props) => {
    return (
        <Card
            isPressable
            as={Link}
            href={`/company/${company.id}`}
            className="w-full border border-default-100 dark:border-default-200"
        >
            <CardBody className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold transition-colors line-clamp-2 hover:text-primary-500">
                        {company.name}
                    </h2>
                    <Chip size="sm" variant="flat">
                        {company.count} 个 Galgame
                    </Chip>
                </div>
                {company.alias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {company.alias.map((alias, index) => (
                            <Chip key={index} size="sm" variant="flat" color="warning">
                                {alias}
                            </Chip>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
