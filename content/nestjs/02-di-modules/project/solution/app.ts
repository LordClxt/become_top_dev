import {
  BadRequestException, Body, ConfigurableModuleBuilder, ConflictException, Controller, DefaultValuePipe, Delete, Get,
  HttpCode, Inject, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post, Query, Res, Scope,
  StandardSchemaValidationPipe, UnprocessableEntityException, VERSION_NEUTRAL, VersioningType, type INestApplication,
} from '@nestjs/common';
import { NestFactory, REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { Response } from 'express';
import { z } from 'zod';

export const SEED = [
  { isbn: '978-2070360024', title: "L'Étranger", author: 'Albert Camus', featured: true, priceCents: 790 },
  { isbn: '978-2253004226', title: 'Germinal', author: 'Émile Zola', featured: false, priceCents: 950 },
  { isbn: '978-2070413119', title: 'Bel-Ami', author: 'Guy de Maupassant', featured: false, priceCents: 690 },
  { isbn: '978-2253096344', title: 'Les Misérables', author: 'Victor Hugo', featured: true, priceCents: 1290 },
];

export type Book = (typeof SEED)[number];

/** Prix par défaut d'un livre ajouté par POST (le schéma de création ne le demande pas). */
export const DEFAULT_PRICE_CENTS = 1000;

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
    const book = { ...data, featured: false, priceCents: DEFAULT_PRICE_CENTS };
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

// ---------- identifiants (module dynamique, jalon 2) ----------

export interface IdGeneratorOptions {
  prefix: string;
}

export const { ConfigurableModuleClass: IdGeneratorBase, MODULE_OPTIONS_TOKEN: ID_OPTIONS } =
  new ConfigurableModuleBuilder<IdGeneratorOptions>().build();

@Injectable()
export class IdGenerator {
  private next = 0;
  constructor(@Inject(ID_OPTIONS) private readonly options: IdGeneratorOptions) {}
  generate(): string {
    return `${this.options.prefix}_${++this.next}`;
  }
}

@Module({ providers: [IdGenerator], exports: [IdGenerator] })
export class IdGeneratorModule extends IdGeneratorBase {}

// ---------- prix (module global configuré une fois) ----------

export interface PricingOptions {
  /** Taux de TVA, par ex. 0.055 pour le livre en France. */
  vatRate: number;
}

export const { ConfigurableModuleClass: PricingBase, MODULE_OPTIONS_TOKEN: PRICING_OPTIONS } =
  new ConfigurableModuleBuilder<PricingOptions>()
    .setClassMethodName('forRoot')
    .setExtras({ isGlobal: false }, (definition, extras) => ({ ...definition, global: extras.isGlobal }))
    .build();

@Injectable()
export class PricingService {
  constructor(@Inject(PRICING_OPTIONS) private readonly options: PricingOptions) {}
  /** Total TTC en centimes, arrondi au centime le plus proche. */
  total(unitPriceCents: number, quantity: number): number {
    return Math.round(unitPriceCents * quantity * (1 + this.options.vatRate));
  }
}

@Module({ providers: [PricingService], exports: [PricingService] })
export class PricingModule extends PricingBase {}

// ---------- contexte de requête (jalon 3) ----------

@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  private readonly id: string;
  private static counter = 0;
  constructor(@Inject(REQUEST) request: Request) {
    this.id = request.header('x-request-id') ?? `req_${++RequestContext.counter}`;
  }
  get requestId(): string {
    return this.id;
  }
}

// ---------- commandes ----------

export const CreateOrder = z.object({
  isbn: z.string(),
  quantity: z.number().int().min(1).max(10),
});
export type CreateOrder = z.infer<typeof CreateOrder>;

export interface Order {
  id: string;
  isbn: string;
  quantity: number;
  totalCents: number;
  requestId: string;
}

/** Les commandes sont un état partagé entre requêtes : un singleton qui ne dépend pas du contexte. */
@Injectable()
export class OrdersRepository {
  private readonly orders = new Map<string, Order>();
  save(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }
  find(id: string): Order | undefined {
    return this.orders.get(id);
  }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly books: BooksService,
    private readonly ids: IdGenerator,
    private readonly pricing: PricingService,
    private readonly repo: OrdersRepository,
    private readonly ctx: RequestContext,
  ) {}

  place(data: CreateOrder): Order {
    const book = this.books.find(data.isbn);
    if (!book) throw new UnprocessableEntityException(`Livre ${data.isbn} inconnu`);
    return this.repo.save({
      id: this.ids.generate(),
      isbn: book.isbn,
      quantity: data.quantity,
      totalCents: this.pricing.total(book.priceCents, data.quantity),
      requestId: this.ctx.requestId,
    });
  }

  find(id: string): Order | undefined {
    return this.repo.find(id);
  }
}

@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body({ schema: CreateOrder }) body: CreateOrder, @Res({ passthrough: true }) res: Response) {
    const order = this.orders.place(body);
    res.location(`/api/v1/orders/${order.id}`);
    return order;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const order = this.orders.find(id);
    if (!order) throw new NotFoundException(`Commande ${id} introuvable`);
    return order;
  }
}

@Module({
  imports: [CatalogModule, IdGeneratorModule.register({ prefix: 'ord' })],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, RequestContext],
})
export class OrdersModule {}

@Module({
  imports: [HealthModule, CatalogModule, PricingModule.forRoot({ vatRate: 0.055, isGlobal: true }), OrdersModule],
})
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
