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

@Controller('health')
export class HealthController {
  private readonly startedAt: number;

  constructor(private readonly clock: Clock) {
    this.startedAt = clock.now();
  }

  @Get()
  get() {
    return { status: 'ok', uptimeS: Math.floor((this.clock.now() - this.startedAt) / 1000) };
  }
}

@Module({ controllers: [HealthController], providers: [Clock] })
export class HealthModule {}

// ---------- M2 : catalogue ----------

@Injectable()
export class BooksService {
  private readonly books: Book[] = [...SEED];

  findAll(): Book[] {
    return [...this.books].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }

  count(): number {
    return this.books.length;
  }
}

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();
  }

  @Get('count')
  count() {
    return { count: this.books.count() };
  }
}

@Module({ controllers: [BooksController], providers: [BooksService], exports: [BooksService] })
export class CatalogModule {}

@Module({ imports: [HealthModule, CatalogModule] })
export class AppModule {}

// ---------- M3 : fabrique ----------

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableShutdownHooks();
  return app;
}
