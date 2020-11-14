import { generatePath, pathToRegexp } from ".";

export type ExtractKeys<T extends {}> = keyof T;
export type StringKeys<T extends {}> = keyof T extends string ? keyof T : never;

export type RouteGetterParams<
  T extends string | number | boolean | undefined
> = T extends undefined
  ? undefined
  : {
      [paramName: string]: T;
    };

interface RouteObject {
  value: string;
  params?: RouteGetterParams<any>;
}
export type RouterGetterRecord<T extends string> = {
  [P in T]: RouteObject;
};

// export type RouterGetterRecord<T extends string> = Record<T, RouteObject>;

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
export class RoutePathGetter<
  K extends string,
  RouteType extends RouterGetterRecord<K> = RouterGetterRecord<K>
> {
  private _routes: RouteType;
  constructor(routes: RouteType) {
    this._routes = routes;
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
    this.validateKey(key);
    const route = this._routes[key];
    try {
      const path = pathToRegexp.parse(route.value);
      return path[0] as string;
    } catch (error) {
      return route.value;
    }
  }

  get routes(): RouteType {
    return Object.assign({}, this._routes) as RouteType;
  }

  private validateKey<K extends keyof RouteType>(pathKey: K): pathKey is K {
    if (typeof this._routes[pathKey] === "undefined") {
      throw new Error(`RoutePathGetter: Invalid Key: ${pathKey}`);
    }
    return true;
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
  path<Key extends K>(key: Key, params?: RouteType[Key]["params"]) {
    if (params) {
      return this.pathParams(key, params);
    }

    this.validateKey(key);

    return this._routes[key].value;
  }

  pathParams<Key extends keyof RouteType>(
    pathKey: Key,
    params: RouteType[Key]["params"]
  ) {
    let r = this._routes[pathKey];

    this.validateKey(pathKey);

    try {
      const path = generatePath(r.value, params);
      return path;
    } catch (error) {
      console.log(error);
      return r.value;
    }
  }

  get keys() {
    return Object.keys(this._routes);
  }

  asArray(): RouteType[] {
    return Object.values(this._routes);
  }

  isRoute(key: keyof RouteType | string): key is keyof RouteType {
    return typeof this._routes[key as keyof RouteType] !== "undefined";
  }
}
