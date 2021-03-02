import { RoutePathGetter } from './RoutePathGetter'


describe('RoutePathGetter', () => {
    test('should return properly typed paths', () => {
        const routes = new RoutePathGetter({
            home: {
                value: '/',
            },
            profile: {
                value: '/profile/:id',
                params: {
                    id: '',
                },
            },
        })
        const hom = routes.path("home", { params: {}, query: '' })
        expect(hom).toBe("/")
        const profNoId = routes.path("profile")
        expect(profNoId).toBe('/profile/:id')
        const profWithId = routes.path("profile", {
            params: {
                id: "1"
            }
        })
        expect(profWithId).toBe("/profile/1")
    })

})
