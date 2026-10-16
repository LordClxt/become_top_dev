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

// ---------- catalogue ----------

// TODO M1 : isbn ^97[89]-\d{10}$, title et author non vides
export const CreateBook = z.object({});
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

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();
  }

  // TODO M1 : GET :isbn, POST, DELETE :isbn
  // TODO M3 : GET featured, déclarée après :isbn
}

// TODO M2 : BooksV2Controller (recherche paginée)

@Module({ controllers: [BooksController], providers: [BooksService], exports: [BooksService] })
export class CatalogModule {}

@Module({ imports: [HealthModule, CatalogModule] })
export class AppModule {}

// ---------- fabrique ----------

export async function createApp(module: unknown = AppModule): Promise<INestApplication> {
  const app = await NestFactory.create(module as never, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableShutdownHooks();
  // TODO M1 : versioning par URI, pipe de validation global
  // TODO M3 : ordre par spécificité, refus des doublons et des routes masquées
  return app;
}
