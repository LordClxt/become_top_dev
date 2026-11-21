package app;

/** Le guichet : ouvre une réservation temporaire par client. Un seul guichet dans l'application. */
public class HoldDesk {
    private final SeatHold seatHold;
    private final ReleaseLog log;

    public HoldDesk(SeatHold seatHold, ReleaseLog log) {
        this.seatHold = seatHold;
        this.log = log;
    }

    /** Une nouvelle réservation, vide, pour un nouveau client. */
    public SeatHold open() {
        return seatHold;
    }
}
