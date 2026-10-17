export type FieldSpec = `${'string' | 'number' | 'boolean'}${'' | '[]'}${'' | '?'}`;
export interface EndpointSpec {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  response: Record<string, FieldSpec>;
}
export type ApiSpec = Record<string, EndpointSpec>;
export type Transport = (method: EndpointSpec['method'], url: string) => Promise<unknown>;

// TODO 1 : les types calculés.
export type FieldType<F extends FieldSpec> = unknown;
export type ResponseOf<R extends Record<string, FieldSpec>> = Record<string, unknown>;
export type PathParams<P extends string> = Record<string, string>;
export type Client<S extends ApiSpec> = Record<string, (params: Record<string, string>) => Promise<unknown>>;

// TODO 2
export function createClient<const S extends ApiSpec>(spec: S, transport: Transport): Client<S> {
  throw new Error('TODO: createClient');
}

// TODO 3
export function generateTypes(spec: ApiSpec): string {
  throw new Error('TODO: generateTypes');
}
