import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** La configuration de l'application. TODO : la rendre profondément immuable. */
public class AppConfig {
    String name;
    int port;
    Duration timeout;
    List<String> hosts;
    Map<String, String> env;
    Map<String, Set<String>> roles;

    AppConfig(Builder b) {
        this.name = b.name;
        this.port = b.port;
        this.timeout = b.timeout;
        this.hosts = b.hosts;
        this.env = b.env;
        this.roles = b.roles;
    }

    public static Builder builder(String name) {
        return new Builder(name);
    }

    public String name() { return name; }

    public int port() { return port; }

    public Duration timeout() { return timeout; }

    public List<String> hosts() { return hosts; }

    public Map<String, String> env() { return env; }

    public Map<String, Set<String>> roles() { return roles; }

    public AppConfig withPort(int port) {
        this.port = port;
        return this;
    }

    public AppConfig withTimeout(Duration timeout) {
        this.timeout = timeout;
        return this;
    }

    public Builder toBuilder() {
        Builder b = new Builder(name);
        b.port = port;
        b.timeout = timeout;
        b.hosts = hosts;
        b.env = env;
        b.roles = roles;
        return b;
    }

    @Override
    public String toString() {
        return "AppConfig[name=" + name + ", port=" + port + ", timeout=" + timeout + ", hosts=" + hosts
                + ", env=" + env + ", roles=" + roles + "]";
    }

    public static class Builder {
        String name;
        int port = 8080;
        Duration timeout = Duration.ofSeconds(30);
        List<String> hosts = new ArrayList<>();
        Map<String, String> env = new HashMap<>();
        Map<String, Set<String>> roles = new HashMap<>();

        Builder(String name) {
            this.name = name;
        }

        public Builder port(int port) {
            this.port = port;
            return this;
        }

        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        public Builder addHost(String host) {
            hosts.add(host);
            return this;
        }

        public Builder env(String key, String value) {
            env.put(key, value);
            return this;
        }

        public Builder grant(String role, String permission) {
            roles.computeIfAbsent(role, r -> new HashSet<>()).add(permission);
            return this;
        }

        public AppConfig build() {
            return new AppConfig(this);
        }
    }
}
