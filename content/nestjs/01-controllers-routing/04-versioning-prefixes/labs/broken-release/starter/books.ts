import { Controller, Get, Injectable, NotFoundException, Param, Query } from '@nestjs/common';

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

  @Get()
  list(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return { page, items: this.books.page(page, limit) };
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
}
