import { Divider } from '@heroui/divider'
import { cn } from '~/utils/cn'

interface Props {
  text: string
  dividerClass?: string
}

export const KunTextDivider = ({ text, dividerClass = '' }: Props) => {
  return (
    <div className="flex items-center justify-center w-full overflow-hidden">
      <Divider className={cn('my-8', dividerClass)} />
      <span className="mx-4 whitespace-nowrap text-default-500">{text}</span>
      <Divider className={cn('my-8', dividerClass)} />
    </div>
  )
}
