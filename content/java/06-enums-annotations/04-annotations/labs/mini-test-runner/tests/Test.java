import java.util.List;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("compte réussis et échoués", () -> {
            Report r = MiniRunner.run(Samples.class);
            Spec.eq(r.passed(), 3, "réussis (a_passes, c_divides, d_nulls)");
            Spec.eq(r.failed(), 5, "échoués");
        });

        Spec.test("un message précis par problème, dans l'ordre des noms", () -> {
            Report r = MiniRunner.run(Samples.class);
            Spec.eq(r.problems(), List.of(
                    "b_fails : IllegalStateException solde négatif",
                    "e_noException : aucune exception",
                    "f_wrongException : IllegalArgumentException inattendue",
                    "g_instance : invalide",
                    "h_withParameter : invalide"), "problèmes");
        });

        Spec.test("une classe sans vérification donne un rapport vide", () -> {
            Report r = MiniRunner.run(String.class);
            Spec.eq(r, new Report(0, 0, List.of()), "rapport sur String");
        });

        Spec.done();
    }
}
