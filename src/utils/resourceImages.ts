/** Shared resource icon lookup for SVG assets in public/images/resources. */
const RESOURCE_IMAGE_FILES: Record<string, string> = {
  Capital: 'Frag_Capital.svg',
  Veil: 'Frag_Veil.svg',
  Antum: 'Frag_Antum.svg',
  Penum: 'Frag_Penum.svg',
  Zephyrion: 'Alien_Zephyrion.svg',
  Yttaldar: 'Alien_Yttaldar.svg',
  Xyloquant: 'Alien_Xyloquant.svg',
  Wraithtex: 'Alien_Wraithtex.svg',
  Verdanix: 'Alien_Verdanix.svg'
}

/**
 * Returns undefined for an unmapped resource.
 * Vite's BASE_URL keeps public assets working on GitHub Pages subpaths.
 */
export function getResourceImageSrc(resourceName: string | null | undefined): string | undefined {
  if (!resourceName) return undefined

  const fileName = RESOURCE_IMAGE_FILES[resourceName]
  if (!fileName) return undefined

  return `${import.meta.env.BASE_URL}images/resources/${fileName}`
}
