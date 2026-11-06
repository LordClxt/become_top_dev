import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.TreeSet;

public class Test {
    static Version v(String s) { return Version.parse(s); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("Version : ordre numérique", () -> {
            List<Version> list = new ArrayList<>(List.of(v("1.10.0"), v("1.9.0"), v("2"), v("1.9.12"), v("1.9.2"), v("0.99")));
            list.sort(null);
            Spec.eq(list.toString(), "[0.99.0, 1.9.0, 1.9.2, 1.9.12, 1.10.0, 2.0.0]", "versions triées");
            Spec.check(v("10.0").compareTo(v("9.9.9")) > 0, "10.0.0 doit être après 9.9.9");
        });

        Spec.test("Version : cohérent avec equals", () -> {
            Spec.eq(v("1.2").compareTo(v("1.2.0")), 0, "1.2 comparé à 1.2.0");
            List<Version> vs = List.of(v("1.2"), v("1.2.0"), v("1.10"), v("1.9.9"), v("3"));
            Spec.eq(new TreeSet<>(vs).size(), new HashSet<>(vs).size(), "TreeSet et HashSet doivent contenir autant de versions");
            for (Version a : vs) for (Version b : vs) {
                Spec.check((a.compareTo(b) == 0) == a.equals(b), a + " et " + b + " : compareTo == 0 doit équivaloir à equals");
                Spec.check(Integer.signum(a.compareTo(b)) == -Integer.signum(b.compareTo(a)), "antisymétrie entre " + a + " et " + b);
            }
        });

        Spec.test("RANKING : scores extrêmes", () -> {
            var cheat = new Player("cheat", Integer.MAX_VALUE, 5);
            var handicap = new Player("handicap", Integer.MIN_VALUE, 5);
            var normal = new Player("normal", -1, 5);
            Spec.check(Leaderboard.RANKING.compare(cheat, normal) < 0, "MAX_VALUE doit passer avant -1 (b - a déborde)");
            Spec.check(Leaderboard.RANKING.compare(normal, handicap) < 0, "-1 doit passer avant MIN_VALUE");
            Spec.check(Leaderboard.RANKING.compare(cheat, handicap) < 0, "MAX_VALUE doit passer avant MIN_VALUE");
        });

        Spec.test("RANKING : départage", () -> {
            var board = new Leaderboard();
            board.add(new Player("zoé", 100, 3000));
            board.add(new Player("ana", 100, 3000));
            board.add(new Player("bo", 100, 1000));
            board.add(new Player("cy", 250, 9000));
            board.add(new Player("dan", 50, 0));
            Spec.eq(board.top(5).stream().map(Player::name).toList(), List.of("cy", "bo", "ana", "zoé", "dan"), "classement");
            Spec.eq(board.top(2).size(), 2, "top(2)");
        });

        Spec.test("RANKING : un vrai ordre total sur des données aléatoires", () -> {
            Random rnd = new Random(42);
            List<Player> ps = new ArrayList<>();
            int[] scores = {Integer.MIN_VALUE, -2_000_000_000, -1, 0, 1, 2_000_000_000, Integer.MAX_VALUE};
            for (int i = 0; i < 60; i++) {
                ps.add(new Player("p" + rnd.nextInt(5), rnd.nextBoolean() ? scores[rnd.nextInt(scores.length)] : rnd.nextInt(),
                        rnd.nextInt(3)));
            }
            for (Player a : ps) for (Player b : ps) for (Player c : ps.subList(0, 15)) {
                int ab = Leaderboard.RANKING.compare(a, b), bc = Leaderboard.RANKING.compare(b, c), ac = Leaderboard.RANKING.compare(a, c);
                Spec.check(Integer.signum(ab) == -Integer.signum(Leaderboard.RANKING.compare(b, a)), "antisymétrie violée entre " + a + " et " + b);
                Spec.check(!(ab < 0 && bc < 0) || ac < 0, "transitivité violée : " + a + " < " + b + " < " + c + " mais pas " + a + " < " + c);
            }
            var set = new TreeSet<>(Leaderboard.RANKING);
            set.addAll(ps);
            Spec.eq(set.size(), new HashSet<>(ps).size(), "un TreeSet(RANKING) ne doit perdre aucun joueur distinct");
        });

        Spec.done();
    }
}
