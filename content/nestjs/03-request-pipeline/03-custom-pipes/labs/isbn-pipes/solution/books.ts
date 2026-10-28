import { Controller, Get, Module, Param } from '@nestjs/common';
import { type Book, BooksService } from './books.service.js';
import { BookByIsbnPipe, ParseIsbnPipe } from './pipes.js';

@Controller('books')
export class BooksController {
  @Get(':isbn')
  findOne(@Param('isbn', ParseIsbnPipe, BookByIsbnPipe) book: Book) {
    return book;
  }

  @Get(':isbn/normalized')
  normalized(@Param('isbn', ParseIsbnPipe) isbn: string) {
    return { isbn };
  }
}

@Module({ controllers: [BooksController], providers: [BooksService] })
export class BooksModule {}
