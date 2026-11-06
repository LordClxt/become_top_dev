/** Les événements comptables d'une journée. */
sealed interface Event permits Sale, Refund, Fee, Chargeback { }

/** Une vente encaissée. */
record Sale(String id, long cents) implements Event { }

/** Un remboursement (partiel ou total) d'une vente. */
record Refund(String saleId, long cents) implements Event { }

/** Des frais facturés par le prestataire ; le montant vient du barème. */
record Fee(FeeKind kind, String saleId) implements Event { }

/** Rétrofacturation : la banque reprend l'argent d'une vente contestée (ajouté jeudi). */
record Chargeback(String saleId, long cents) implements Event { }

enum FeeKind { LATE, CANCELLATION, CURRENCY }
