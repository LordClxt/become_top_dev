import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Le classement d'un tournoi. */
public final class Leaderboard {
    /** Score décroissant, puis fin la plus tôt, puis nom. */
    public static final Comparator<Player> RANKING = (a, b) -> b.score() - a.score(); // TODO

    private final List<Player> players = new ArrayList<>();

    public void add(Player p) {
        players.add(p);
    }

    public List<Player> top(int n) {
        List<Player> sorted = new ArrayList<>(players);
        sorted.sort(RANKING);
        return List.copyOf(sorted.subList(0, Math.min(n, sorted.size())));
    }
}
