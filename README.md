# route-path-getter

Class to orginize the router paths of an application. Could be used with any Framework like Angular, React, Vue, Ionic, Express or any javascript based app.

## Install

```
npm i route-path-getter
```

or

```
yarn add route-path-getter
```

## Example Use

```ts
import { RoutePathGetter } from "../src/index";

//Creating Instance
export const appRoutes = new RoutePathGetter({
  home: {
    value: "/",
  },
  profile: {
    value: "/profile/:id",
    params: {
      id: "",
    },
  },
});

//Using Instance with Type Safety
appRoutes.path("home"); // returns '/'
appRoutes.path("profile"); // returns '/profile/:id

appRoutes.path("profile", { id: "1" }); // returns '/profile/1

// appRoutes.path('profile', { ss:'' }) // TypeError: Object literal may only specify known properties, and 'ss' does not exist in type '{ id: string; }'.ts(2345);

// appRoutes.path('other'); // Argument of type '"other"' is not assignable to parameter of type 'RouteKeys'.
```
