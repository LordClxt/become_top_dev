/** Une erreur métier : elle ne connaît pas HTTP. */
export class OutOfStockError extends Error {
  constructor(readonly isbn: string) {
    super(`Plus d'exemplaire de ${isbn}`);
  }
}
