import { Body, Controller, Get, Post } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { Clock } from './clock.js';
import { LatestService } from './latest.service.js';

@Controller('books')
export class BooksController {
  private readonly books = new BooksService();

  constructor(private readonly clock: Clock, private readonly latestBooks: LatestService) {}

  @Post()
  add(@Body() body: { isbn: string; title: string }) {
    return this.books.add(body.isbn, body.title, this.clock.now());
  }

  @Get('latest')
  latest() {
    return this.latestBooks.latest();
  }
}
