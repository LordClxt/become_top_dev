import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/** Agent HTTP de test, branché sur le serveur de l'application (sans port). */
export function http(app: INestApplication) {
  return request(app.getHttpServer());
}
