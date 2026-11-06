import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

/** Vérifie les contrats d'equals, de hashCode et de compareTo sur des échantillons. */
public final class Contracts {
    private Contracts() { throw new AssertionError(); }

    /** Résultat d'un appel qui a pu lever : value == null signifie « a levé ». */
    private record Outcome<V>(V value, Throwable error) {
        static <V> Outcome<V> of(Supplier<V> call) {
            try {
                return new Outcome<>(Objects.requireNonNull(call.get()), null);
            } catch (RuntimeException | Error e) {
                return new Outcome<>(null, e);
            }
        }

        boolean failed() { return error != null; }
    }

    public static Report checkEquals(List<?> samples) {
        Object[] s = copy(samples);
        int n = s.length;
        var report = new Report.Builder();

        Integer[] hash = new Integer[n];
        for (int i = 0; i < n; i++) {
            Object x = s[i];
            Outcome<Integer> h1 = Outcome.of(x::hashCode), h2 = Outcome.of(x::hashCode);
            if (h1.failed() || h2.failed()) {
                report.add(Kind.EXCEPTION, "hashCode de " + show(x) + " lève " + (h1.failed() ? h1.error() : h2.error()));
            } else {
                hash[i] = h1.value();
                if (!h1.value().equals(h2.value())) {
                    report.add(Kind.CONSISTENCY, "deux appels à " + show(x) + ".hashCode() donnent " + h1.value() + " puis " + h2.value());
                }
            }
            Outcome<Boolean> withNull = Outcome.of(() -> x.equals(null));
            if (withNull.failed() || withNull.value()) {
                report.add(Kind.NON_NULLITY, show(x) + ".equals(null) " + (withNull.failed() ? "lève " + withNull.error() : "renvoie true"));
            }
        }

        boolean[][] eq = new boolean[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                Object x = s[i], y = s[j];
                Outcome<Boolean> first = Outcome.of(() -> x.equals(y)), second = Outcome.of(() -> x.equals(y));
                if (first.failed() || second.failed()) {
                    report.add(Kind.EXCEPTION, show(x) + ".equals(" + show(y) + ") lève " + (first.failed() ? first.error() : second.error()));
                    continue; // compte comme false
                }
                eq[i][j] = first.value();
                if (!first.value().equals(second.value())) {
                    report.add(Kind.CONSISTENCY, show(x) + ".equals(" + show(y) + ") renvoie " + first.value() + " puis " + second.value());
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (!eq[i][i]) report.add(Kind.REFLEXIVITY, show(s[i]) + ".equals(lui-même) est faux");
            for (int j = 0; j < n; j++) {
                if (eq[i][j] != eq[j][i]) {
                    report.add(Kind.SYMMETRY, show(s[i]) + ".equals(" + show(s[j]) + ") = " + eq[i][j]
                            + " mais " + show(s[j]) + ".equals(" + show(s[i]) + ") = " + eq[j][i]);
                }
                if (eq[i][j] && hash[i] != null && hash[j] != null && !hash[i].equals(hash[j])) {
                    report.add(Kind.HASH_CODE, show(s[i]) + " et " + show(s[j]) + " sont égaux mais ont pour hash " + hash[i] + " et " + hash[j]);
                }
                if (!eq[i][j]) continue;
                for (int k = 0; k < n; k++) {
                    if (eq[j][k] && !eq[i][k]) {
                        report.add(Kind.TRANSITIVITY, show(s[i]) + " = " + show(s[j]) + " et " + show(s[j]) + " = " + show(s[k])
                                + ", mais " + show(s[i]) + " ≠ " + show(s[k]));
                    }
                }
            }
        }
        return report.build();
    }

    public static <T> Report checkComparator(List<? extends T> samples, Comparator<? super T> comparator) {
        Objects.requireNonNull(comparator, "comparator");
        @SuppressWarnings("unchecked") // copy ne contient que des éléments de samples, donc des T
        T[] s = (T[]) copy(samples);
        int n = s.length;
        var report = new Report.Builder();

        Integer[][] sgn = new Integer[n][n]; // null : compare a levé
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                T x = s[i], y = s[j];
                Outcome<Integer> c = Outcome.of(() -> comparator.compare(x, y));
                if (c.failed()) {
                    report.add(Kind.EXCEPTION, "compare(" + show(x) + ", " + show(y) + ") lève " + c.error());
                    continue;
                }
                sgn[i][j] = Integer.signum(c.value());
                Outcome<Boolean> e = Outcome.of(() -> x.equals(y));
                if (e.failed()) {
                    report.add(Kind.EXCEPTION, show(x) + ".equals(" + show(y) + ") lève " + e.error());
                } else if ((sgn[i][j] == 0) != e.value()) {
                    report.add(Kind.INCONSISTENT_WITH_EQUALS, "compare(" + show(x) + ", " + show(y) + ") " + (sgn[i][j] == 0 ? "= 0" : "≠ 0")
                            + " mais equals renvoie " + e.value());
                }
            }
        }

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                Integer ij = sgn[i][j], ji = sgn[j][i];
                if (ij == null) continue;
                if (ji != null && ij != -ji) {
                    report.add(Kind.SIGN, "compare(" + show(s[i]) + ", " + show(s[j]) + ") et compare(" + show(s[j]) + ", " + show(s[i])
                            + ") ont les signes " + ij + " et " + ji);
                }
                for (int k = 0; k < n; k++) {
                    Integer jk = sgn[j][k], ik = sgn[i][k];
                    if (jk == null || ik == null) continue;
                    if (ij > 0 && jk > 0 && ik <= 0) {
                        report.add(Kind.COMPARE_TRANSITIVITY, show(s[i]) + " > " + show(s[j]) + " > " + show(s[k]) + ", mais pas "
                                + show(s[i]) + " > " + show(s[k]));
                    }
                    if (ij == 0 && !ik.equals(jk)) {
                        report.add(Kind.COMPARE_SUBSTITUTION, show(s[i]) + " et " + show(s[j]) + " se comparent à 0 mais pas pareil à "
                                + show(s[k]));
                    }
                }
            }
        }
        return report.build();
    }

    public static <T extends Comparable<? super T>> Report checkComparable(List<T> samples) {
        return checkComparator(samples, Comparator.naturalOrder());
    }

    private static Object[] copy(List<?> samples) {
        Object[] s = samples.toArray();
        for (Object o : s) Objects.requireNonNull(o, "les échantillons ne doivent pas contenir null");
        return s;
    }

    private static String show(Object o) {
        return Report.show(o);
    }
}
