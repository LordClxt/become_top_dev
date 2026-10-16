import { Controller, Get, Injectable, Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

export const SEED = [
  { isbn: '978-2070360024', title: "L'Étranger", author: 'Albert Camus' },
  { isbn: '978-2253004226', title: 'Germinal', author: 'Émile Zola' },
  { isbn: '978-2070413119', title: 'Bel-Ami', author: 'Guy de Maupassant' },
  { isbn: '978-2253096344', title: 'Les Misérables', author: 'Victor Hugo' },
];

export type Book = (typeof SEED)[number];

// ---------- M1 : santé ----------

@Injectable()
export class Clock {
  now(): number {
    return Date.now();
  }
}

export class HealthController {
  get(): unknown {
    throw new Error('TODO M1: GET /health');
  }
}

@Module({})
export class HealthModule {}

// ---------- M2 : catalogue ----------

export class BooksService {
  findAll(): Book[] {
    throw new Error('TODO M2: findAll');
  }

  count(): number {
    throw new Error('TODO M2: count');
  }
}

export class BooksController {}

@Module({})
export class CatalogModule {}

@Module({})
export class AppModule {}

// ---------- M3 : fabrique ----------

export async function createApp(): Promise<INestApplication> {
  throw new Error('TODO M3: createApp');
}
