import { Controller, Get, Param } from '@nestjs/common';

const BOOKS: Record<string, { isbn: string; title: string }> = {
  '978-2253004226': { isbn: '978-2253004226', title: 'Germinal' },
};

@Controller('books')
export class BooksController {
  @Get(':isbn')
  findOne(@Param('isbn') isbn: string) {
    return BOOKS[isbn]; // TODO : un livre absent doit donner 404, pas 200 vide
  }
}
