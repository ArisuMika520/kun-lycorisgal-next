import { Card, CardBody, CardHeader } from '@heroui/card'
import Image from 'next/image'
import { kunMoyuMoe } from '~/config/moyu-moe'

interface Props {
  title: string
  children: React.ReactNode
}

export const LoginContainer = ({ title, children }: Props) => {
  return (
    <div className="flex items-center justify-center w-full min-h-full py-8">
      <Card className="relative w-full max-w-md overflow-visible">
        <Image
          src="/sticker.webp"
          alt=""
          aria-hidden
          width={96}
          height={96}
          className="absolute z-20 select-none pointer-events-none -top-7 -right-5 rotate-12 drop-shadow-lg"
        />
        <CardHeader className="flex flex-col items-center pt-8 space-y-6">
          <div className="flex items-center space-x-2 font-medium cursor-default text-medium text-default-500">
            <Image
              src="/favicon.webp"
              priority={true}
              alt={kunMoyuMoe.titleShort}
              width={36}
              height={36}
              className="rounded-full"
            />
            <span>{kunMoyuMoe.titleShort}</span>
          </div>

          <h1 className="text-3xl font-bold">{title}</h1>
        </CardHeader>
        <CardBody className="flex justify-center px-8 py-6">
          {children}
        </CardBody>
      </Card>
    </div>
  )
}
