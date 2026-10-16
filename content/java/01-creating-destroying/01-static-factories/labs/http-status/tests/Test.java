import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("of : renvoie le code et la raison connue", () -> {
            HttpStatus s = HttpStatus.of(201);
            Spec.eq(s.code(), 201, "of(201).code()");
            Spec.eq(s.reason(), "Created", "of(201).reason()");
            Spec.eq(HttpStatus.of(299).reason(), "Unknown", "raison d'un code non répertorié");
        });

        Spec.test("of : deux appels pour le même code renvoient la même instance", () -> {
            Spec.check(HttpStatus.of(404) == HttpStatus.of(404),
                    "of(404) == of(404) est faux : la fabrique crée un nouvel objet à chaque appel au lieu de le réutiliser");
            Spec.check(HttpStatus.of(299) == HttpStatus.of(299),
                    "même un code non répertorié (299) doit n'avoir qu'une instance : garde-la après le premier appel");
        });

        Spec.test("les constantes sont les instances de la fabrique", () -> {
            Spec.check(HttpStatus.OK == HttpStatus.of(200), "HttpStatus.OK doit être l'objet renvoyé par of(200)");
            Spec.check(HttpStatus.NOT_FOUND == HttpStatus.of(404), "HttpStatus.NOT_FOUND doit être l'objet renvoyé par of(404)");
        });

        Spec.test("of : refuse un code hors de [100, 599]", () -> {
            var e = Spec.raises(IllegalArgumentException.class, () -> HttpStatus.of(42), "of(42)");
            Spec.check(e.getMessage() != null && e.getMessage().contains("42"),
                    "le message d'erreur doit contenir la valeur fautive (42) pour aider au diagnostic");
            Spec.raises(IllegalArgumentException.class, () -> HttpStatus.of(600), "of(600)");
        });

        Spec.test("from : lit une ligne de statut", () -> {
            Spec.check(HttpStatus.from("404 Not Found") == HttpStatus.NOT_FOUND, "from(\"404 Not Found\") doit renvoyer NOT_FOUND");
            Spec.eq(HttpStatus.from("  201  ").code(), 201, "from(\"  201  \") (espaces autour)");
            Spec.eq(HttpStatus.from("418 I'm a teapot").code(), 418, "from(\"418 I'm a teapot\")");
        });

        Spec.test("from : une ligne illisible donne IllegalArgumentException", () -> {
            Spec.raises(IllegalArgumentException.class, () -> HttpStatus.from("OK 200"), "from(\"OK 200\")");
            Spec.raises(IllegalArgumentException.class, () -> HttpStatus.from(""), "from(\"\")");
        });

        Spec.test("HttpStatus : aucun constructeur accessible hors de la classe", () -> {
            for (Constructor<?> c : HttpStatus.class.getDeclaredConstructors()) {
                Spec.check(Modifier.isPrivate(c.getModifiers()),
                        "le constructeur " + c + " est accessible : un client pourrait contourner le contrôle d'instances");
            }
        });

        Spec.test("StatusCodes : non instanciable, même par réflexion", () -> {
            Constructor<?>[] ctors = StatusCodes.class.getDeclaredConstructors();
            Spec.eq(ctors.length, 1, "nombre de constructeurs déclarés (sans constructeur explicite, le compilateur en ajoute un public)");
            Spec.check(Modifier.isPrivate(ctors[0].getModifiers()), "le constructeur de StatusCodes doit être privé");
            ctors[0].setAccessible(true);
            try {
                ctors[0].newInstance();
                throw new Spec.Failure("instancier StatusCodes par réflexion a réussi : le constructeur doit lever AssertionError");
            } catch (InvocationTargetException e) {
                Spec.check(e.getCause() instanceof AssertionError,
                        "le constructeur doit lever AssertionError, pas " + e.getCause());
            }
        });

        Spec.test("StatusCodes : les fonctions marchent toujours", () -> {
            Spec.eq(StatusCodes.family(503), 5, "family(503)");
            Spec.check(StatusCodes.isSuccess(204), "isSuccess(204)");
        });

        Spec.done();
    }
}
