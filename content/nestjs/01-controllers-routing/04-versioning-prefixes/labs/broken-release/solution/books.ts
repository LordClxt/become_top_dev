import { Controller, DefaultValuePipe, Get, Injectable, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';

export const BOOKS = Array.from({ length: 25 }, (_, i) => ({
  isbn: `978-20000000${String(i).padStart(2, '0')}`,
  title: `Livre ${i + 1}`,
  featured: i % 10 === 0,
}));

@Injectable()
export class BooksService {
  page(page: number, limit: number) {
    return BOOKS.slice((page - 1) * limit, page * limit);
  }
  find(isbn: string) {
    return BOOKS.find((b) => b.isbn === isbn);
  }
  featured() {
    return BOOKS.filter((b) => b.featured);
  }
}

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  /** Cause n°3 : la query est une chaîne ; slice() la convertit par coercition, mais 'page' était renvoyée en chaîne et 'deux' donnait NaN. */
  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return { page, items: this.books.page(page, limit) };
  }

  /** Cause n°1 : déclarée après ':isbn', la route littérale était masquée. */
  @Get('featured')
  featured() {
    return this.books.featured();
  }

  @Get(':isbn')
  findOne(@Param('isbn') isbn: string) {
    const book = this.books.find(isbn);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }
}
