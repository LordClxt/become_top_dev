import { Injectable } from '@nestjs/common';
import { join } from 'node:path';

@Injectable()
export class CatalogService {
  private readonly books = [
    { isbn: '978-2070360024', title: "L'Étranger" },
    { isbn: '978-2253004226', title: 'Germinal' },
  ];

  findAll() {
    return this.books;
  }

  /** Dossier des fichiers de données, à côté de ce module compilé. */
  dataDir(): string {
    return join(import.meta.dirname, 'data');
  }
}
