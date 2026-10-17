import { eq, run, test } from './spec.ts';
import { findRoute, isMethod, METHODS, routes, tuple } from './routes.ts';

test('METHODS et isMethod', () => {
  eq(METHODS, ['GET', 'POST', 'PUT', 'DELETE'], 'METHODS');
  eq(isMethod('GET'), true, "isMethod('GET')");
  eq(isMethod('DELETE'), true, "isMethod('DELETE')");
  eq(isMethod('get'), false, "isMethod('get')");
  eq(isMethod('PATCH'), false, "isMethod('PATCH')");
});

test('routes', () => {
  eq(Object.keys(routes), ['home', 'createUser', 'deleteUser'], 'clés de routes');
});

test('tuple', () => {
  eq(tuple(1, 'a', true), [1, 'a', true], "tuple(1, 'a', true)");
  eq(tuple(), [], 'tuple()');
});

test('findRoute', () => {
  eq(findRoute('POST', '/users'), 'createUser', "findRoute('POST', '/users')");
  eq(findRoute('GET', '/'), 'home', "findRoute('GET', '/')");
  eq(findRoute('GET', '/users'), undefined, "findRoute('GET', '/users')");
});

await run();
