import { Injectable } from '@nestjs/common';
import { Clock } from './clock.js';
import { BooksService } from './books.service.js';

/**
 * Cause n°2 : sans décorateur, tsc n'écrit pas design:paramtypes. Nest voit un constructeur
 * sans paramètre, l'appelle sans argument, et books/clock valent undefined : aucune erreur au démarrage.
 */
@Injectable()
export class LatestService {
  constructor(private readonly books: BooksService, private readonly clock: Clock) {}
  latest() {
    const weekAgo = this.clock.now().getTime() - 7 * 24 * 3600 * 1000;
    return this.books.all().filter((b) => new Date(b.addedAt).getTime() >= weekAgo);
  }
}
