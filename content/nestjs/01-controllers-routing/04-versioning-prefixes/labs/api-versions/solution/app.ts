import { Controller, Get, Injectable, Module, Version, VERSION_NEUTRAL, VersioningType, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Injectable()
export class BooksService {
  private readonly books = [
    { isbn: '978-2253004226', title: 'Germinal' },
    { isbn: '978-2070360024', title: "L'Étranger" },
  ];
  findAll() {
    return this.books;
  }
  count() {
    return this.books.length;
  }
}

@Controller({ path: 'books', version: '1' })
export class BooksV1Controller {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();
  }

  @Version(['1', '2'])
  @Get('count')
  count() {
    return { count: this.books.count() };
  }
}

@Controller({ path: 'books', version: '2' })
export class BooksV2Controller {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return { items: this.books.findAll(), total: this.books.count() };
  }
}

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Module({ controllers: [BooksV1Controller, BooksV2Controller, HealthController], providers: [BooksService] })
export class AppModule {}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  return app;
}
