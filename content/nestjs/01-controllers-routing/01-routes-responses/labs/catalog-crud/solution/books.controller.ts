import { Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { type Book, BooksService } from './books.service.js';

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll(): Book[] {
    return this.books.findAll();
  }

  @Get(':isbn')
  findOne(@Param('isbn') isbn: string): Book {
    const book = this.books.find(isbn);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }

  @Post()
  create(@Body() body: Book, @Res({ passthrough: true }) res: Response): Book {
    const book = this.books.create(body);
    if (!book) throw new ConflictException(`L'ISBN ${body.isbn} existe déjà`);
    res.location(`/books/${book.isbn}`);
    return book;
  }

  @Put(':isbn')
  replace(@Param('isbn') isbn: string, @Body() body: { title: string }): Book {
    const book = this.books.update(isbn, body.title);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }

  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') isbn: string): void {
    if (!this.books.remove(isbn)) throw new NotFoundException(`Livre ${isbn} introuvable`);
  }
}
