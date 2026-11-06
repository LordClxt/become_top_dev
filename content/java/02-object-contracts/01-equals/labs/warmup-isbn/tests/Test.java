import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("equals(Object) est redéfini", () -> {
            try {
                Spec.check(Isbn.class.getDeclaredMethod("equals", Object.class) != null, "");
            } catch (NoSuchMethodException e) {
                throw new Spec.Failure("Isbn ne redéfinit pas equals(Object) : la signature doit prendre un Object");
            }
        });

        Spec.test("même livre, deux écritures", () -> {
            Isbn a = Isbn.parse("978-2-07-036822-8");
            Isbn b = Isbn.parse("9782070368228");
            Spec.check(a.equals(b), "978-2-07-036822-8 et 9782070368228 désignent le même livre");
            Spec.check(b.equals(a), "l'égalité doit être symétrique");
            Spec.check(!a.equals(Isbn.parse("9782070360024")), "deux livres différents ne sont pas égaux");
        });

        Spec.test("réflexive, non nulle, typée", () -> {
            Isbn a = Isbn.parse("9782070368228");
            Spec.check(a.equals(a), "a.equals(a)");
            Spec.check(!a.equals(null), "a.equals(null) doit valoir false");
            Spec.check(!a.equals("9782070368228"), "un Isbn n'est pas égal à une String, même de mêmes chiffres");
        });

        Spec.test("les collections le voient", () -> {
            Set<Isbn> stock = new HashSet<>(List.of(Isbn.parse("978-2-07-036822-8")));
            Spec.check(stock.contains(Isbn.parse("9782070368228")), "stock.contains(…) doit trouver le livre importé par l'autre fournisseur");
            Spec.check(List.of(Isbn.parse("9782070368228")).contains(Isbn.parse("978 2 07 036822 8")), "List.contains passe aussi par equals");
        });

        Spec.done();
    }
}
