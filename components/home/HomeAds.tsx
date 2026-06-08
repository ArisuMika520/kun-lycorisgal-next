import { KunAdSlot } from '~/components/kun/ad/KunAdSlot'
import { kunHomeAds } from '~/config/ads'

export const HomeAds = () => {
  return <KunAdSlot ads={kunHomeAds} closable />
}
