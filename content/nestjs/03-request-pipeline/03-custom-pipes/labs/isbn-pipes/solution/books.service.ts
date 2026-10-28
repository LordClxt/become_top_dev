import { Injectable } from '@nestjs/common';

export interface Book { isbn: string; title: string }

@Injectable()
export class BooksService {
  private readonly books: Book[] = [
    { isbn: '978-2253004226', title: 'Germinal' },
    { isbn: '978-2070413119', title: 'Bel-Ami' },
  ];
  find(isbn: string): Book | undefined {
    return this.books.find((b) => b.isbn === isbn);
  }
}
