import { Injectable, type PipeTransform } from '@nestjs/common';
import type { Book } from './books.service.js';

/** Accepte un ISBN-13 avec ou sans tirets/espaces, vérifie la clé, renvoie `978-XXXXXXXXXX`. */
@Injectable()
export class ParseIsbnPipe implements PipeTransform<string, string> {
  transform(_value: string): string {
    throw new Error('TODO');
  }
}

/** Transforme un ISBN normalisé en livre ; 404 si absent. */
@Injectable()
export class BookByIsbnPipe implements PipeTransform<string, Book> {
  transform(_isbn: string): Book {
    throw new Error('TODO');
  }
}
