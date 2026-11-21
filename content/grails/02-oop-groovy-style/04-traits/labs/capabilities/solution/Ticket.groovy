// Le trait le plus à droite s'exécute en premier : Validated filtre avant tout horodatage ou audit.
class Ticket implements Persistent, Timestamped, Audited, SoftDeletable, Validated {
    String title

    boolean isValid() { title?.trim() as boolean }

    String getAuditName() { "ticket '$title'" }
}
