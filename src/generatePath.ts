import { pathToRegexp } from './path-to-regexp'
import type { PathFunction } from './path-to-regexp'
const cache: { [key: string]: PathFunction } = {}
const cacheLimit = 10000
let cacheCount = 0

function compilePath(path: string) {
  if (cache[path]) return cache[path]

  const generator = pathToRegexp.compile(path)

  if (cacheCount < cacheLimit) {
    cache[path] = generator
    cacheCount++
  }

  return generator
}

/**
 * Public API for generating a URL pathname from a path and parameters.
 */
export function generatePath(path = '/', params = {}) {
  return path === '/' ? path : compilePath(path)(params, { pretty: true })
}
