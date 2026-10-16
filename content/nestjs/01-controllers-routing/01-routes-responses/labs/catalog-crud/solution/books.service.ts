import { Injectable } from '@nestjs/common';

export interface Book {
  isbn: string;
  title: string;
}

@Injectable()
export class BooksService {
  private readonly books = new Map<string, Book>([
    ['978-2070360024', { isbn: '978-2070360024', title: "L'Étranger" }],
    ['978-2253004226', { isbn: '978-2253004226', title: 'Germinal' }],
  ]);

  findAll(): Book[] {
    return [...this.books.values()];
  }

  find(isbn: string): Book | undefined {
    return this.books.get(isbn);
  }

  /** null si l'ISBN existe déjà. */
  create(book: Book): Book | null {
    if (this.books.has(book.isbn)) return null;
    this.books.set(book.isbn, { ...book });
    return this.books.get(book.isbn)!;
  }

  update(isbn: string, title: string): Book | undefined {
    const book = this.books.get(isbn);
    if (book) book.title = title;
    return book;
  }

  /** false si le livre n'existait pas. */
  remove(isbn: string): boolean {
    return this.books.delete(isbn);
  }
}
