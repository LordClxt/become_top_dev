import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

/**
 * La configuration de l'application. Profondément immuable : toutes les collections sont des copies
 * non modifiables, faites une fois à la frontière ({@link Builder#build()}), puis partagées librement.
 */
public final class AppConfig {
    private static final Duration MAX_TIMEOUT = Duration.ofMinutes(5);

    private final String name;
    private final int port;
    private final Duration timeout;
    private final List<String> hosts;
    private final Map<String, String> env;
    private final Map<String, Set<String>> roles;

    /** Le seul constructeur : reçoit des collections déjà immuables et valide tout. */
    private AppConfig(String name, int port, Duration timeout, List<String> hosts, Map<String, String> env,
            Map<String, Set<String>> roles) {
        this.name = Objects.requireNonNull(name, "name").strip();
        if (this.name.isEmpty()) throw new IllegalArgumentException("nom vide");
        if (port < 1 || port > 65_535) throw new IllegalArgumentException("port hors limites : " + port);
        Objects.requireNonNull(timeout, "timeout");
        if (timeout.isNegative() || timeout.isZero() || timeout.compareTo(MAX_TIMEOUT) > 0) {
            throw new IllegalArgumentException("timeout hors limites : " + timeout);
        }
        if (hosts.isEmpty()) throw new IllegalArgumentException("au moins un hôte attendu");
        this.port = port;
        this.timeout = timeout;
        this.hosts = hosts;
        this.env = env;
        this.roles = roles;
    }

    public static Builder builder(String name) {
        return new Builder(name);
    }

    public String name() { return name; }

    public int port() { return port; }

    public Duration timeout() { return timeout; }

    /** Non modifiable. */
    public List<String> hosts() { return hosts; }

    /** Non modifiable. */
    public Map<String, String> env() { return env; }

    /** Non modifiable, ensembles de permissions compris. */
    public Map<String, Set<String>> roles() { return roles; }

    /** Une nouvelle configuration ; les collections, immuables, sont partagées. */
    public AppConfig withPort(int port) {
        return port == this.port ? this : new AppConfig(name, port, timeout, hosts, env, roles);
    }

    /** Une nouvelle configuration ; les collections, immuables, sont partagées. */
    public AppConfig withTimeout(Duration timeout) {
        return new AppConfig(name, port, timeout, hosts, env, roles);
    }

    public Builder toBuilder() {
        Builder b = new Builder(name).port(port).timeout(timeout);
        hosts.forEach(b::addHost);
        env.forEach(b::env);
        roles.forEach((role, perms) -> perms.forEach(p -> b.grant(role, p)));
        return b;
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof AppConfig c && c.port == port && c.name.equals(name) && c.timeout.equals(timeout)
                && c.hosts.equals(hosts) && c.env.equals(env) && c.roles.equals(roles));
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, port, timeout, hosts, env, roles);
    }

    /**
     * Toute la configuration, variables d'environnement triées par nom. La valeur de toute variable dont le
     * nom contient SECRET, PASSWORD ou TOKEN (insensible à la casse) est remplacée par « *** ».
     * Format destiné aux humains : il peut changer.
     */
    @Override
    public String toString() {
        Map<String, String> shown = new TreeMap<>();
        env.forEach((k, v) -> shown.put(k, isSecret(k) ? "***" : v));
        return "AppConfig[name=" + name + ", port=" + port + ", timeout=" + timeout + ", hosts=" + hosts
                + ", env=" + shown + ", roles=" + new TreeMap<>(roles) + "]";
    }

    private static boolean isSecret(String key) {
        String k = key.toUpperCase(Locale.ROOT);
        return k.contains("SECRET") || k.contains("PASSWORD") || k.contains("TOKEN");
    }

    /** Compagnon mutable. Réutilisable : chaque build() produit une configuration indépendante. */
    public static final class Builder {
        private final String name;
        private int port = 8080;
        private Duration timeout = Duration.ofSeconds(30);
        private final Set<String> hosts = new LinkedHashSet<>();
        private final Map<String, String> env = new LinkedHashMap<>();
        private final Map<String, Set<String>> roles = new LinkedHashMap<>();

        private Builder(String name) {
            this.name = Objects.requireNonNull(name, "name");
        }

        public Builder port(int port) {
            this.port = port;
            return this;
        }

        public Builder timeout(Duration timeout) {
            this.timeout = Objects.requireNonNull(timeout, "timeout");
            return this;
        }

        public Builder addHost(String host) {
            hosts.add(Objects.requireNonNull(host, "host"));
            return this;
        }

        public Builder env(String key, String value) {
            env.put(Objects.requireNonNull(key, "key"), Objects.requireNonNull(value, "value"));
            return this;
        }

        public Builder grant(String role, String permission) {
            Objects.requireNonNull(permission, "permission");
            roles.computeIfAbsent(Objects.requireNonNull(role, "role"), r -> new LinkedHashSet<>()).add(permission);
            return this;
        }

        /** Copie en profondeur, une seule fois : ensuite, tout est partageable. */
        public AppConfig build() {
            Map<String, Set<String>> frozenRoles = new LinkedHashMap<>();
            roles.forEach((role, perms) -> frozenRoles.put(role, Collections.unmodifiableSet(new LinkedHashSet<>(perms))));
            return new AppConfig(name, port, timeout, List.copyOf(hosts), Collections.unmodifiableMap(new LinkedHashMap<>(env)),
                    Collections.unmodifiableMap(frozenRoles));
        }
    }
}
