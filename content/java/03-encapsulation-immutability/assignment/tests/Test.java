import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.Duration;
import java.util.List;
import java.util.Set;

public class Test {
    static AppConfig.Builder base() {
        return AppConfig.builder("billing").addHost("db1.internal").addHost("db2.internal")
                .env("REGION", "eu-west-3").env("DB_PASSWORD", "hunter2").env("api_token", "tk-123")
                .grant("admin", "read").grant("admin", "write").grant("viewer", "read");
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("valeurs par défaut et construction", () -> {
            AppConfig c = base().build();
            Spec.eq(c.port(), 8080, "port par défaut");
            Spec.eq(c.timeout(), Duration.ofSeconds(30), "timeout par défaut");
            Spec.eq(c.hosts(), List.of("db1.internal", "db2.internal"), "hôtes");
            Spec.eq(c.roles().get("admin"), Set.of("read", "write"), "permissions admin");
            Spec.eq(base().addHost("db1.internal").build().hosts(), List.of("db1.internal", "db2.internal"), "un doublon est ignoré");
        });

        Spec.test("validation", () -> {
            Spec.raises(IllegalArgumentException.class, () -> AppConfig.builder("x").build(), "aucun hôte");
            Spec.raises(IllegalArgumentException.class, () -> AppConfig.builder(" ").addHost("h").build(), "nom vide");
            Spec.raises(IllegalArgumentException.class, () -> base().port(0).build(), "port 0");
            Spec.raises(IllegalArgumentException.class, () -> base().port(65_536).build(), "port 65 536");
            Spec.raises(IllegalArgumentException.class, () -> base().timeout(Duration.ZERO).build(), "timeout nul");
            Spec.raises(IllegalArgumentException.class, () -> base().timeout(Duration.ofMinutes(6)).build(), "timeout de 6 min");
            Spec.raises(NullPointerException.class, () -> base().addHost(null), "hôte null");
            Spec.raises(NullPointerException.class, () -> base().env("K", null), "valeur d'environnement null");
        });

        Spec.test("réutiliser le builder ne change pas une configuration construite", () -> {
            AppConfig.Builder b = base();
            AppConfig c = b.build();
            b.addHost("db3.internal").env("REGION", "us-east-1").grant("admin", "delete").grant("ops", "deploy").port(9000);
            Spec.eq(c.hosts().size(), 2, "hôtes après réutilisation du builder");
            Spec.eq(c.env().get("REGION"), "eu-west-3", "REGION après réutilisation du builder");
            Spec.eq(c.roles().get("admin"), Set.of("read", "write"), "permissions admin après grant sur le builder");
            Spec.check(!c.roles().containsKey("ops"), "le rôle ops ne doit pas apparaître");
            Spec.eq(c.port(), 8080, "port");
        });

        Spec.test("les accesseurs ne permettent aucune modification", () -> {
            AppConfig c = base().build();
            Spec.raises(UnsupportedOperationException.class, () -> c.hosts().add("evil"), "hosts().add");
            Spec.raises(UnsupportedOperationException.class, () -> c.env().put("REGION", "x"), "env().put");
            Spec.raises(UnsupportedOperationException.class, () -> c.roles().put("root", Set.of()), "roles().put");
            Spec.raises(UnsupportedOperationException.class, () -> c.roles().get("viewer").add("write"),
                    "roles().get(\"viewer\").add (l'immutabilité doit être profonde)");
            Spec.eq(c.roles().get("viewer"), Set.of("read"), "permissions viewer");
        });

        Spec.test("withPort et withTimeout : nouvelles configurations, internes partagés", () -> {
            AppConfig c = base().build();
            AppConfig d = c.withPort(9090);
            Spec.eq(c.port(), 8080, "l'original après withPort");
            Spec.eq(d.port(), 9090, "la nouvelle configuration");
            Spec.check(d.hosts() == c.hosts() && d.env() == c.env() && d.roles() == c.roles(),
                    "withPort doit partager les collections immuables au lieu de les recopier");
            AppConfig e = c.withTimeout(Duration.ofSeconds(5));
            Spec.eq(e.timeout(), Duration.ofSeconds(5), "withTimeout");
            Spec.eq(c.timeout(), Duration.ofSeconds(30), "l'original après withTimeout");
            Spec.raises(IllegalArgumentException.class, () -> c.withPort(70_000), "withPort(70 000)");
            Spec.raises(IllegalArgumentException.class, () -> c.withTimeout(Duration.ofSeconds(-1)), "withTimeout négatif");
        });

        Spec.test("toBuilder", () -> {
            AppConfig c = base().port(7000).build();
            Spec.eq(c.toBuilder().build(), c, "toBuilder().build() égal à l'original");
            AppConfig d = c.toBuilder().addHost("db9.internal").grant("viewer", "export").build();
            Spec.eq(d.hosts().size(), 3, "nouvelle configuration");
            Spec.eq(c.hosts().size(), 2, "l'original après toBuilder");
            Spec.eq(c.roles().get("viewer"), Set.of("read"), "permissions viewer de l'original");
        });

        Spec.test("equals, hashCode", () -> {
            Spec.eq(base().build(), base().build(), "deux constructions identiques");
            Spec.eq(base().build().hashCode(), base().build().hashCode(), "leurs hash");
            Spec.check(!base().build().equals(base().port(81).build()), "ports différents");
        });

        Spec.test("toString ne fuit aucun secret", () -> {
            String s = base().build().toString();
            Spec.check(!s.contains("hunter2"), "le mot de passe apparaît dans toString : " + s);
            Spec.check(!s.contains("tk-123"), "le jeton apparaît dans toString : " + s);
            Spec.check(s.contains("eu-west-3") && s.contains("db2.internal") && s.contains("***"), "toString doit montrer le reste : " + s);
        });

        Spec.test("structure", () -> {
            Spec.eq(AppConfig.class.getConstructors().length, 0, "constructeurs publics d'AppConfig");
            Spec.check(Modifier.isFinal(AppConfig.class.getModifiers()), "AppConfig doit être final");
            for (Field f : AppConfig.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                Spec.check(Modifier.isPrivate(f.getModifiers()) && Modifier.isFinal(f.getModifiers()),
                        "AppConfig." + f.getName() + " doit être private final");
            }
        });

        Spec.done();
    }
}
