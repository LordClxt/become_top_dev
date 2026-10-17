import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// Lis instructions.md : tout est à construire ici.
@Module({})
export class AppModule {}

export async function createApp(): Promise<INestApplication> {
  return NestFactory.create(AppModule, { logger: false });
}
