import java.util.ArrayList;
import java.util.List;

public class Test {
    static void compiles(String name, String body) {
        var r = Javac.client(name, "import java.util.*;\nimport java.util.function.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
        Spec.check(r.clean(), "ce client doit compiler sans cast ni avertissement :\n" + body + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("ok, err, map et flatMap", () -> {
            Result<Integer> ok = Result.ok(21);
            Spec.eq(ok.map(n -> n * 2).toString(), "Ok(42)", "map");
            Spec.eq(Result.<Integer>err("panne").map(n -> n * 2).toString(), "Err(panne)", "map d'une erreur");
            Spec.eq(ok.flatMap(n -> n > 20 ? Result.ok("grand") : Result.err("petit")).toString(), "Ok(grand)", "flatMap");
            Spec.eq(ok.flatMap(n -> Result.<String>err("refusé")).toString(), "Err(refusé)", "flatMap vers une erreur");
            Spec.raises(NullPointerException.class, () -> Result.ok(null), "ok(null)");
        });

        Spec.test("orElseGet, ifOk et sequence", () -> {
            Spec.eq(Result.<Integer>err("x").orElseGet(() -> 7), 7, "orElseGet");
            List<Integer> seen = new ArrayList<>();
            Result.ok(5).ifOk(seen::add);
            Spec.eq(seen, List.of(5), "ifOk");
            Spec.eq(Result.sequence(List.of(Result.ok(1), Result.ok(2))).toString(), "Ok([1, 2])", "sequence de deux Ok");
            Spec.eq(Result.sequence(List.of(Result.ok(1), Result.<Integer>err("a"), Result.<Integer>err("b"))).toString(), "Err(a)", "sequence avec erreurs");
        });

        Spec.test("map et ifOk acceptent des fonctions plus générales (consommateurs : super)", () -> {
            compiles("SuperClient", """
                    Result<String> f(Result<Integer> r, Function<Object, String> describe, Consumer<Number> log) {
                        r.ifOk(log);
                        return r.map(describe);
                    }""");
        });

        Spec.test("map et orElseGet acceptent des fonctions plus précises (producteurs : extends)", () -> {
            compiles("ExtendsClient", """
                    Number f(Result<Number> r, Function<Number, Integer> round, Supplier<Integer> zero) {
                        Result<Number> rounded = r.map(round);
                        return rounded.orElseGet(zero);
                    }""");
        });

        Spec.test("flatMap accepte un Result d'un sous-type", () -> {
            compiles("FlatClient", """
                    Result<Number> f(Result<String> r, Function<String, Result<Integer>> parse) {
                        return r.flatMap(parse);
                    }""");
        });

        Spec.test("sequence accepte une liste de Result d'un sous-type", () -> {
            compiles("SeqClient", """
                    Result<List<Number>> f(List<Result<Integer>> results) {
                        return Result.sequence(results);
                    }""");
        });

        Spec.test("Result.java : zéro avertissement (-Xlint:all -Werror)", () -> {
            var r = Javac.file("Result.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
        });

        Spec.done();
    }
}
