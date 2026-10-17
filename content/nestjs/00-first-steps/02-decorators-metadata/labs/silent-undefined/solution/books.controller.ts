import { Body, Controller, Get, Post } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { Clock } from './clock.js';
import { LatestService } from './latest.service.js';

/** Cause n°1 : `new BooksService()` créait une instance hors du conteneur, distincte de celle de LatestService. */
@Controller('books')
export class BooksController {
  constructor(
    private readonly books: BooksService,
    private readonly clock: Clock,
    private readonly latestBooks: LatestService,
  ) {}

  @Post()
  add(@Body() body: { isbn: string; title: string }) {
    return this.books.add(body.isbn, body.title, this.clock.now());
  }

  @Get('latest')
  latest() {
    return this.latestBooks.latest();
  }
}
