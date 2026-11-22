import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.function.Function;

public class Test {
    static void compiles(String name, String body) {
        var r = Javac.client(name, "import java.util.*;\nimport java.util.function.*;\nimport java.math.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
        Spec.check(r.clean(), "ce client doit compiler sans cast ni avertissement :\n" + body + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("convertisseur exact", () -> {
            Converters c = new Converters();
            c.register(String.class, Integer.class, Integer::valueOf);
            Spec.eq(c.convert("42", Integer.class), 42, "\"42\" → Integer");
        });

        Spec.test("le super-type le plus proche gagne", () -> {
            Converters c = new Converters();
            c.register(Object.class, String.class, o -> "objet");
            c.register(Number.class, String.class, n -> "nombre " + n);
            Spec.eq(c.convert(7, String.class), "nombre 7", "Integer → String par le convertisseur de Number");
            c.register(Integer.class, String.class, i -> "entier " + i);
            Spec.eq(c.convert(7, String.class), "entier 7", "le convertisseur d'Integer, plus proche, l'emporte");
            Spec.eq(c.convert(true, String.class), "objet", "Boolean → String par le convertisseur d'Object");
        });

        Spec.test("un convertisseur d'interface s'applique aussi", () -> {
            Converters c = new Converters();
            c.register(CharSequence.class, Integer.class, CharSequence::length);
            Spec.eq(c.convert(new StringBuilder("ordo"), Integer.class), 4, "StringBuilder → Integer par CharSequence");
        });

        Spec.test("déjà du bon type : renvoyé tel quel ; sinon, une erreur qui nomme les deux types", () -> {
            Converters c = new Converters();
            Spec.eq(c.convert(12, Number.class), 12, "Integer est déjà un Number");
            Spec.eq(c.tryConvert(1.5, String.class), Optional.empty(), "tryConvert sans convertisseur");
            try {
                c.convert(1.5, String.class);
                Spec.check(false, "convert sans convertisseur doit lever IllegalArgumentException");
            } catch (IllegalArgumentException e) {
                Spec.check(e.getMessage().contains("Double") && e.getMessage().contains("String"), "message : " + e.getMessage());
            }
        });

        Spec.test("converter(from, to) renvoie une fonction typée", () -> {
            Converters c = new Converters();
            c.register(String.class, BigDecimal.class, BigDecimal::new);
            Function<String, BigDecimal> parse = c.converter(String.class, BigDecimal.class);
            Spec.eq(parse.apply("12.50"), new BigDecimal("12.50"), "parse(\"12.50\")");
        });

        Spec.test("des fonctions plus générales ou plus précises sont acceptées", () -> {
            compiles("SuperClient", "void f(Converters c, Function<Object, String> describe) { c.register(Integer.class, String.class, describe); }");
            compiles("ExtendsClient", "void f(Converters c, Function<String, BigDecimal> parse) { c.register(String.class, Number.class, parse); }");
            compiles("TypedClient", "BigDecimal f(Converters c) { return c.convert(\"1\", BigDecimal.class); }");
        });

        Spec.test("un convertisseur glissé par un type brut ne livre jamais un mauvais type", () -> {
            Converters c = new Converters();
            @SuppressWarnings({ "unchecked", "rawtypes" }) Function<String, String> lying = (Function) (Function<String, Integer>) String::length;
            c.register(String.class, String.class, lying);
            Spec.raises(ClassCastException.class, () -> c.convert("abc", String.class), "un Integer livré comme String");
        });

        Spec.test("Converters.java : zéro avertissement (-Xlint:all -Werror), classe finale", () -> {
            var r = Javac.file("Converters.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
            Spec.check(Modifier.isFinal(Converters.class.getModifiers()), "Converters n'est pas conçue pour l'héritage");
        });

        Spec.done();
    }
}
