import { Controller, Get, Module, NotFoundException, Param, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

const BOOKS = [
  { isbn: '978-2253004226', title: 'Germinal', featured: true, sales: 120 },
  { isbn: '978-2070360024', title: "L'Étranger", featured: false, sales: 340 },
];

@Controller('books')
export class BooksController {
  @Get(':isbn')
  findOne(@Param('isbn') isbn: string) {
    const book = BOOKS.find((b) => b.isbn === isbn);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return { handler: 'findOne', book };
  }

  @Get('featured')
  featured() {
    return { handler: 'featured', books: BOOKS.filter((b) => b.featured) };
  }

  @Get('stats')
  stats() {
    return { handler: 'stats', count: BOOKS.length };
  }
}

/** Statistiques réservées à l'équipe : chiffre d'affaires du catalogue. */
@Controller('books')
export class AdminController {
  @Get('stats')
  adminStats() {
    return { handler: 'adminStats', totalSales: BOOKS.reduce((n, b) => n + b.sales, 0) };
  }
}

@Module({ controllers: [BooksController, AdminController] })
export class AppModule {}

export async function createApp(module: unknown): Promise<INestApplication> {
  return NestFactory.create(module as never, { logger: false, abortOnError: false });
}
