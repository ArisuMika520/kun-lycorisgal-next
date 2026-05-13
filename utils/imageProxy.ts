const PROXY_IMAGE_HOSTS = new Set(['r2.lycorisgal.com'])

export const getImageProxySrc = (src?: string) => {
  if (!src || src.trim() === '') {
    return undefined
  }

  try {
    const url = new URL(src)
    if (PROXY_IMAGE_HOSTS.has(url.hostname)) {
      return `/api/proxy-image?url=${encodeURIComponent(url.toString())}`
    }
  } catch {
    return src
  }

  return src
}
