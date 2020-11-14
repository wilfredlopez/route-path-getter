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

appRoutes.path("profile", { params: { id: "1" } }); // returns '/profile/1

// appRoutes.path("profile", { params: { ss: "" } }); // TypeError: Object literal may only specify known properties, and 'ss' does not exist in type '{ id: string; }'.ts(2345);

// appRoutes.path('other'); // Argument of type '"other"' is not assignable to parameter of type 'RouteKeys'.

// USING QUERIES
appRoutes.path("profile", { params: { id: "1" }, query: "id=123" }); // returns '/profile/1?id=123
