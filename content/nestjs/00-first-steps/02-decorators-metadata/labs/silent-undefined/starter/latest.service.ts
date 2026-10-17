import { Clock } from './clock.js';
import { BooksService } from './books.service.js';

/** Les nouveautés : les livres ajoutés dans les 7 derniers jours. */
export class LatestService {
  constructor(private readonly books: BooksService, private readonly clock: Clock) {}
  latest() {
    const weekAgo = this.clock.now().getTime() - 7 * 24 * 3600 * 1000;
    return this.books.all().filter((b) => new Date(b.addedAt).getTime() >= weekAgo);
  }
}
