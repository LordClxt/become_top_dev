import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("chaque changement connaît son départ et son arrivée", () -> {
            Spec.eq(PhaseChange.HALT.from(), SessionPhase.OPEN, "HALT.from()");
            Spec.eq(PhaseChange.HALT.to(), SessionPhase.HALTED, "HALT.to()");
            Spec.eq(PhaseChange.RESUME.from(), SessionPhase.HALTED, "RESUME.from()");
            Spec.eq(PhaseChange.RESUME.to(), SessionPhase.AUCTION, "RESUME.to()");
            Spec.eq(PhaseChange.START_TRADING.to(), SessionPhase.OPEN, "START_TRADING.to()");
        });

        Spec.test("between retrouve chaque changement autorisé", () -> {
            for (PhaseChange c : PhaseChange.values()) {
                Spec.eq(PhaseChange.between(c.from(), c.to()), Optional.of(c), "between(" + c.from() + ", " + c.to() + ")");
            }
            Spec.eq(PhaseChange.between(SessionPhase.AUCTION, SessionPhase.OPEN), Optional.of(PhaseChange.START_TRADING), "enchère → séance");
        });

        Spec.test("les changements interdits sont refusés", () -> {
            Spec.eq(PhaseChange.between(SessionPhase.CLOSED, SessionPhase.OPEN), Optional.empty(), "clôture → séance");
            Spec.eq(PhaseChange.between(SessionPhase.PRE_OPEN, SessionPhase.OPEN), Optional.empty(), "pré-ouverture → séance, sans enchère");
            Spec.eq(PhaseChange.between(SessionPhase.HALTED, SessionPhase.OPEN), Optional.empty(), "suspension → séance, sans enchère");
        });

        Spec.test("reachableFrom renvoie un ensemble dans l'ordre de déclaration", () -> {
            Set<SessionPhase> fromOpen = PhaseChange.reachableFrom(SessionPhase.OPEN);
            Spec.eq(List.copyOf(fromOpen), List.of(SessionPhase.HALTED, SessionPhase.CLOSED), "depuis OPEN");
            Spec.eq(PhaseChange.reachableFrom(SessionPhase.AUCTION), EnumSet.of(SessionPhase.HALTED, SessionPhase.OPEN), "depuis AUCTION");
            Spec.eq(PhaseChange.reachableFrom(SessionPhase.CLOSED), Set.of(), "depuis CLOSED");
        });

        Spec.test("plus aucun ordinal() dans PhaseChange", () -> {
            String source = java.nio.file.Files.readString(java.nio.file.Path.of("PhaseChange.java"));
            Spec.check(!source.contains("ordinal()"), "PhaseChange.java ne doit plus dépendre de la position des constantes (ordinal())");
        });

        Spec.done();
    }
}
