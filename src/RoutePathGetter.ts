import { generatePath } from './generatePath'
import { pathToRegexp } from './path-to-regexp'

// export type ExtractKeys<T extends {}> = keyof T;
// export type StringKeys<T extends {}> = keyof T extends string ? keyof T : never;

export type RouteGetterParams<T extends string | number | boolean | undefined> = T extends undefined
  ? undefined
  : {
    [P in keyof T]: T
  }

export interface RouteObject<T extends string | number | boolean | undefined> {
  value: string
  params?: RouteGetterParams<T>
}
export type RouterGetterRecord<T extends keyof any> = {
  [P in T]: RouteObject<any> extends infer RO ? RO : RouteObject<any>
}

/**
 * Generates Type Safed Routes for React Router or any other router.
 * @example
 *
 * //Creating Interfaces
 * type RouteKeys = 'home' | 'profile';
 *
 * const routes: RouterGetterRecord<RouteKeys> = {
 *   home: {
 *     value: '/',
 *   },
 *   profile: {
 *     value: '/profile/:id',
 *     params: {
 *       id: '',
 *     },
 *   },
 * }
 *
 * //Creating Instance
 * const appRoutes = new RoutePathGetter<RouteKeys>(routes);
 * //Using Instance with Type Safety
 * appRoutes.path('profile', { id: '1' }); // returns '/profile/1
 * // appRoutes.path('profile', { ss:'' }) // TypeError: Object literal may only specify known properties, and 'ss' does not exist in type '{ id: string; }'.ts(2345);
 * appRoutes.path('home'); // returns '/'
 * // appRoutes.path('other'); // Argument of type '"other"' is not assignable to parameter of type 'RouteKeys'.
 */
export class RoutePathGetter<RouteType extends RouterGetterRecord<keyof any> = RouterGetterRecord<keyof any>> {
  private _routes: RouteType
  constructor(routes: RouteType) {
    this._routes = routes
  }

  /**
   *
   * @param key key of the Route.
   * @returns the value without the parameters.
   * @example
   * //for '/users/:id'
   * rootPath('users-key') // returns '/users'
   */
  rootPath<Key extends keyof RouteType>(key: Key): string {
    this.validateKey(key)
    const route = this._routes[key]
    try {
      const path = pathToRegexp.parse(route.value)
      return path[0] as string
    } catch (error) {
      return route.value
    }
  }

  get routes(): RouteType {
    return Object.assign({}, this._routes) as RouteType
  }

  private validateKey<Key extends keyof RouteType>(pathKey: Key): pathKey is Key {
    if (typeof this._routes[pathKey] === 'undefined') {
      throw new Error(`RoutePathGetter: Invalid Key: ${pathKey}`)
    }
    return true
  }

  /**
   *
   * @param key key of the route
   * @param params [Optional] parameters. for example route '/user/:id' will replace `:id` with the param passed.
   * @example
   * // Assuming there is a route {value: '/users/:id', params: {id:''}}
   * instance.path('users', {id: '122'}) // returns '/users/122'
   * instance.path('users') // returns '/users/:id'
   */
  path<Key extends keyof RouteType>(
    key: Key,
    { params, query }: { params?: RouteType[Key]['params']; query?: string } = {}
  ) {
    if (params) {
      return this.pathParams(key, { params, query })
    }

    this.validateKey(key)

    return this.joinQuery(this._routes[key].value, query)
  }

  private joinQuery(route: string, query?: string) {
    return query ? route + '?' + query : route
  }

  pathParams<Key extends keyof RouteType>(
    pathKey: Key,
    { params, query }: { params: RouteType[Key]['params']; query?: string }
  ) {
    let r = this._routes[pathKey]

    this.validateKey(pathKey)

    try {
      const path = generatePath(r.value, params)
      return this.joinQuery(path, query)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('RoutePathGetter: ', error)
      }
      return this.joinQuery(r.value, query)
    }
  }

  get keys() {
    return Object.keys(this._routes)
  }

  asArray(): RouteType[] {
    return Object.values(this._routes) as any
  }

  isRoute(key: keyof RouteType | string): key is keyof RouteType {
    return typeof this._routes[key as keyof RouteType] !== 'undefined'
  }
}
