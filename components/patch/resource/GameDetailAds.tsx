import { KunAdSlot } from '~/components/kun/ad/KunAdSlot'
import { kunGameDetailAds } from '~/config/ads'

export const GameDetailAds = () => {
  return <KunAdSlot ads={kunGameDetailAds} className="mt-6" />
}
