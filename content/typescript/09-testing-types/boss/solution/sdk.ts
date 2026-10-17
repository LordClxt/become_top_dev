export type FieldSpec = `${'string' | 'number' | 'boolean'}${'' | '[]'}${'' | '?'}`;
export interface EndpointSpec {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  response: Record<string, FieldSpec>;
}
export type ApiSpec = Record<string, EndpointSpec>;
export type Transport = (method: EndpointSpec['method'], url: string) => Promise<unknown>;

type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };
type Strip<F> = F extends `${infer R}?` ? R : F;
type BaseType<B> = B extends 'string' ? string : B extends 'number' ? number : B extends 'boolean' ? boolean : never;
export type FieldType<F extends FieldSpec> = Strip<F> extends `${infer B}[]` ? BaseType<B>[] : BaseType<Strip<F>>;
type OptionalKeys<R> = { [K in keyof R]: R[K] extends `${string}?` ? K : never }[keyof R];
/** Aplati par Resolve : lisible au survol, égal pour Equals. */
export type ResponseOf<R extends Record<string, FieldSpec>> = Resolve<
  { -readonly [K in Exclude<keyof R, OptionalKeys<R>>]: FieldType<R[K]> } & { -readonly [K in OptionalKeys<R>]?: FieldType<R[K]> }
>;

type ParamNames<P extends string, Acc extends string> =
  P extends `${string}:${infer Name}/${infer Rest}` ? ParamNames<Rest, Acc | Name> :
  P extends `${string}:${infer Name}` ? Acc | Name :
  Acc;
/** Récursion terminale : l'accumulateur collecte les noms de paramètres. */
export type PathParams<P extends string> = { [K in ParamNames<P, never>]: string };

export type Client<S extends ApiSpec> = {
  [K in keyof S]: (params: PathParams<S[K]['path']>) => Promise<ResponseOf<S[K]['response']>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldOk(value: unknown, field: FieldSpec): boolean {
  const optionalField = field.endsWith('?');
  if (value === undefined) return optionalField;
  const core = optionalField ? field.slice(0, -1) : field;
  if (core.endsWith('[]')) {
    const base = core.slice(0, -2);
    return Array.isArray(value) && value.every((x) => typeof x === base);
  }
  return typeof value === core;
}

function validate(data: unknown, response: Record<string, FieldSpec>): Record<string, unknown> {
  if (!isRecord(data)) throw new Error('réponse invalide : objet attendu');
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(response)) {
    const value = data[key];
    if (!fieldOk(value, field)) throw new Error(`réponse invalide : ${key}`);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

const buildUrl = (path: string, params: Record<string, string>) =>
  path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''));

export function createClient<const S extends ApiSpec>(spec: S, transport: Transport): Client<S> {
  const methods = Object.fromEntries(
    Object.entries(spec).map(([name, endpoint]) => [
      name,
      async (params: Record<string, string>) =>
        validate(await transport(endpoint.method, buildUrl(endpoint.path, params)), endpoint.response),
    ]),
  );
  // Assertion justifiée : une méthode par endpoint, qui valide la réponse selon sa spécification (ResponseOf).
  return methods as unknown as Client<S>;
}

const pascal = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export function generateTypes(spec: ApiSpec): string {
  return Object.keys(spec)
    .toSorted()
    .map((name) => {
      const lines = Object.entries(spec[name]!.response).map(([key, field]) =>
        field.endsWith('?') ? `  ${key}?: ${field.slice(0, -1)};` : `  ${key}: ${field};`,
      );
      return [`export interface ${pascal(name)}Response {`, ...lines, '}'].join('\n');
    })
    .join('\n\n');
}
