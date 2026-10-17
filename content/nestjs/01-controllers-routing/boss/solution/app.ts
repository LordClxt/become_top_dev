import {
  Body, ConflictException, Controller, DefaultValuePipe, Delete, Get, HttpCode, Injectable, Module, NotFoundException,
  Param, ParseIntPipe, Post, Query, Res, StandardSchemaValidationPipe, VERSION_NEUTRAL, VersioningType,
  BadRequestException, type INestApplication,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Response } from 'express';
import { z } from 'zod';

export const BOOKS = ['978-2253004226', '978-2070413119'];

export const CreateReview = z.object({
  author: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(2000),
});
export type CreateReview = z.infer<typeof CreateReview>;

export interface Review extends CreateReview { id: number; isbn: string }

@Injectable()
export class ReviewsService {
  private readonly reviews: Review[] = [];
  private nextId = 1;

  private requireBook(isbn: string): void {
    if (!BOOKS.includes(isbn)) throw new NotFoundException(`Livre ${isbn} introuvable`);
  }

  list(isbn: string): Review[] {
    this.requireBook(isbn);
    return this.reviews.filter((r) => r.isbn === isbn);
  }

  create(isbn: string, data: CreateReview): Review {
    this.requireBook(isbn);
    if (this.reviews.some((r) => r.isbn === isbn && r.author === data.author)) {
      throw new ConflictException(`${data.author} a déjà donné son avis sur ce livre`);
    }
    const review = { id: this.nextId++, isbn, ...data };
    this.reviews.push(review);
    return review;
  }

  remove(isbn: string, id: number): void {
    this.requireBook(isbn);
    const i = this.reviews.findIndex((r) => r.isbn === isbn && r.id === id);
    if (i < 0) throw new NotFoundException(`Avis ${id} introuvable`);
    this.reviews.splice(i, 1);
  }
}

@Controller({ path: 'books/:isbn/reviews', version: '1' })
export class ReviewsV1Controller {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Param('isbn') isbn: string) {
    return this.reviews.list(isbn);
  }

  @Get('summary')
  summary(@Param('isbn') isbn: string) {
    const all = this.reviews.list(isbn);
    const average = all.length ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10 : null;
    return { count: all.length, average };
  }

  @Post()
  create(@Param('isbn') isbn: string, @Body({ schema: CreateReview }) body: CreateReview,
    @Res({ passthrough: true }) res: Response) {
    const review = this.reviews.create(isbn, body);
    res.location(`/api/v1/books/${isbn}/reviews/${review.id}`);
    return review;
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('isbn') isbn: string, @Param('id', ParseIntPipe) id: number): void {
    this.reviews.remove(isbn, id);
  }
}

const MAX_LIMIT = 20;

@Controller({ path: 'books/:isbn/reviews', version: '2' })
export class ReviewsV2Controller {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Param('isbn') isbn: string,
    @Query('minRating', new DefaultValuePipe(1), ParseIntPipe) minRating: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    if (minRating < 1 || minRating > 5) throw new BadRequestException('minRating doit être entre 1 et 5');
    if (limit < 1 || limit > MAX_LIMIT) throw new BadRequestException(`limit doit être entre 1 et ${MAX_LIMIT}`);
    if (offset < 0) throw new BadRequestException('offset doit être ≥ 0');
    const matches = this.reviews.list(isbn).filter((r) => r.rating >= minRating);
    return { items: matches.slice(offset, offset + limit), total: matches.length, limit, offset };
  }
}

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get() get() { return { status: 'ok' }; }
}

@Module({ controllers: [HealthController, ReviewsV1Controller, ReviewsV2Controller], providers: [ReviewsService] })
export class AppModule {}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
    routeResolutionStrategy: 'specificity',
    routeConflictPolicy: { duplicate: 'error', shadow: 'error' },
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  return app;
}
