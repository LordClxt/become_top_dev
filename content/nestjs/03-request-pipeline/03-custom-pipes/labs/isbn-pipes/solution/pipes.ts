import { BadRequestException, Injectable, NotFoundException, type PipeTransform } from '@nestjs/common';
import { type Book, BooksService } from './books.service.js';

/** Accepte un ISBN-13 avec ou sans tirets/espaces, vérifie la clé, renvoie `978-XXXXXXXXXX`. */
@Injectable()
export class ParseIsbnPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const digits = String(value ?? '').replace(/[\s-]/g, '');
    if (!/^97[89]\d{10}$/.test(digits) || !ParseIsbnPipe.checksumOk(digits)) {
      throw new BadRequestException(`ISBN invalide : ${value}`, { errorCode: 'INVALID_ISBN' });
    }
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  /** ISBN-13 : somme des chiffres pondérés 1, 3, 1, 3… multiple de 10. */
  static checksumOk(digits: string): boolean {
    const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
}

/** Transforme un ISBN normalisé en livre ; 404 si absent. */
@Injectable()
export class BookByIsbnPipe implements PipeTransform<string, Book> {
  constructor(private readonly books: BooksService) {}
  transform(isbn: string): Book {
    const book = this.books.find(isbn);
    if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
    return book;
  }
}
