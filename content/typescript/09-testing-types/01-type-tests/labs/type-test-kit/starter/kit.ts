// TODO 1 à 4
export type Equals<X, Y> = X extends Y ? true : false;
export type Expect<T> = T;
export type ExpectFalse<T> = T;
export type IsAny<T> = false;
export type Assignable<From, To> = boolean;

// TODO 5 : curryfiée, n'accepte que des valeurs exactement de type T.
export function assertType<T>() {
  return <V>(value: V): V => value;
}
