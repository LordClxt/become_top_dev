import {
  BadRequestException, Body, ConflictException, Controller, DefaultValuePipe, Delete, Get, HttpCode, Injectable,
  Module, NotFoundException, Param, ParseIntPipe, Post, Query, Res, StandardSchemaValidationPipe,
  VERSION_NEUTRAL, VersioningType, type INestApplication,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Response } from 'express';
import { z } from 'zod';

export const SEED = [
  { isbn: '978-2070360024', title: "L'Étranger", author: 'Albert Camus', featured: true },
  { isbn: '978-2253004226', title: 'Germinal', author: 'Émile Zola', featured: false },
  { isbn: '978-2070413119', title: 'Bel-Ami', author: 'Guy de Maupassant', featured: false },
  { isbn: '978-2253096344', title: 'Les Misérables', author: 'Victor Hugo', featured: true },
];

export type Book = (typeof SEED)[number];

// ---------- santé (jalon 0) ----------

@Injectable()
export class Clock {
  now(): number {
    return Date.now();
  }
}

@Controller({ path: 'health', version: VERSION_NEUTRAL })
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

// ---------- catalogue ----------

export const CreateBook = z.object({
  isbn: z.string().regex(/^97[89]-\d{10}$/),
  title: z.string().min(1),
  author: z.string().min(1),
});
export type CreateBook = z.infer<typeof CreateBook>;

@Injectable()
export class BooksService {
  private readonly books: Book[] = SEED.map((b) => ({ ...b }));

  findAll(): Book[] {
    return [...this.books].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }

  find(isbn: string): Book | undefined {
    return this.books.find((b) => b.isbn === isbn);
  }

  featured(): Book[] {
    return this.findAll().filter((b) => b.featured);
  }

  /** null si l'ISBN existe déjà. */
  create(data: { isbn: string; title: string; author: string }): Book | null {
    if (this.find(data.isbn)) return null;
    const book = { ...data, featured: false };
    this.books.push(book);
    return book;
  }

  /** false si le livre n'existait pas. */
  remove(isbn: string): boolean {
    const i = this.books.findIndex((b) => b.isbn === isbn);
    if (i < 0) return false;
    this.books.splice(i, 1);
    return true;
  }

  count(): number {
    return this.books.length;
  }
}

const MAX_LIMIT = 50;

@Controller({ path: 'books', version: '1' })
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();
  }

  @Get(':isbn')
  findOne(@Param('isbn') isbn: string) {
    const book = this.books.find(isbn);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }

  @Get('featured')
  featured() {
    return this.books.featured();
  }

  @Post()
  create(@Body({ schema: CreateBook }) body: CreateBook, @Res({ passthrough: true }) res: Response) {
    const book = this.books.create(body);
    if (!book) throw new ConflictException(`L'ISBN ${body.isbn} existe déjà`);
    res.location(`/api/v1/books/${book.isbn}`);
    return book;
  }

  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') isbn: string): void {
    if (!this.books.remove(isbn)) throw new NotFoundException(`Livre ${isbn} introuvable`);
  }
}

@Controller({ path: 'books', version: '2' })
export class BooksV2Controller {
  constructor(private readonly books: BooksService) {}

  @Get()
  search(
    @Query('author') author: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1) throw new BadRequestException('page doit être ≥ 1');
    if (limit < 1 || limit > MAX_LIMIT) throw new BadRequestException(`limit doit être entre 1 et ${MAX_LIMIT}`);
    const needle = author?.toLowerCase();
    const matches = needle
      ? this.books.findAll().filter((b) => b.author.toLowerCase().includes(needle))
      : this.books.findAll();
    return { items: matches.slice((page - 1) * limit, page * limit), page, limit, total: matches.length };
  }
}

@Module({ controllers: [BooksController, BooksV2Controller], providers: [BooksService], exports: [BooksService] })
export class CatalogModule {}

@Module({ imports: [HealthModule, CatalogModule] })
export class AppModule {}

// ---------- fabrique ----------

export async function createApp(module: unknown = AppModule): Promise<INestApplication> {
  const app = await NestFactory.create(module as never, {
    logger: false,
    abortOnError: false,
    routeResolutionStrategy: 'specificity',
    routeConflictPolicy: { duplicate: 'error', shadow: 'error' },
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableShutdownHooks();
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  return app;
}
