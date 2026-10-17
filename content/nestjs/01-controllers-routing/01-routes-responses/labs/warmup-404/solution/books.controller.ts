import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

const BOOKS: Record<string, { isbn: string; title: string }> = {
  '978-2253004226': { isbn: '978-2253004226', title: 'Germinal' },
};

@Controller('books')
export class BooksController {
  @Get(':isbn')
  findOne(@Param('isbn') isbn: string) {
    const book = BOOKS[isbn];
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }
}
