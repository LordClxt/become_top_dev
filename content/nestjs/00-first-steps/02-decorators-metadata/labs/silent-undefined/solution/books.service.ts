import { Injectable } from '@nestjs/common';

export interface Book { isbn: string; title: string; addedAt: string }

@Injectable()
export class BooksService {
  private readonly books: Book[] = [];
  add(isbn: string, title: string, addedAt: Date): Book {
    const book = { isbn, title, addedAt: addedAt.toISOString() };
    this.books.push(book);
    return book;
  }
  all(): Book[] {
    return this.books;
  }
}
