import { KunAdSlot } from '~/components/kun/ad/KunAdSlot'
import { kunRedirectAds } from '~/config/ads'

export const RedirectAds = () => {
  return <KunAdSlot ads={kunRedirectAds} variant="plain" />
}
