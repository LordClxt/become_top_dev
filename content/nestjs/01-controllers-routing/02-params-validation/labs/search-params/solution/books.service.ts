import { Injectable } from '@nestjs/common';

export interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
}

const AUTHORS = ['Émile Zola', 'Victor Hugo', 'George Sand'];

@Injectable()
export class BooksService {
  private readonly books: Book[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    title: `Livre ${i + 1}`,
    author: AUTHORS[i % AUTHORS.length]!,
    year: 1850 + i,
  }));

  all(): Book[] {
    return this.books;
  }

  find(id: number): Book | undefined {
    return this.books.find((b) => b.id === id);
  }

  add(data: Omit<Book, 'id'>): Book {
    const book = { id: this.books.length + 1, ...data };
    this.books.push(book);
    return book;
  }
}
