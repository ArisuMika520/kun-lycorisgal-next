import { HomeContainer } from '~/components/home/Container'
import type { Metadata } from 'next'
import { kunGetActions } from '../actions'
import { kunMoyuMoe } from '~/config/moyu-moe'


export const metadata: Metadata = {
  metadataBase: new URL(kunMoyuMoe.domain.main),
  title: {
      default: kunMoyuMoe.title,
      template: kunMoyuMoe.template
    },
  description: kunMoyuMoe.description,
  keywords: kunMoyuMoe.keywords,
  authors: kunMoyuMoe.author
}


export const revalidate = 3

export default async function Kun() {
  const response = await kunGetActions()

  return (
    <div className="container mx-auto my-4 space-y-6">
      <HomeContainer {...response} />
    </div>
  )
}