import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("aucun tableau public", () -> {
            for (Field f : Currencies.class.getDeclaredFields()) {
                Spec.check(!(f.getType().isArray() && Modifier.isPublic(f.getModifiers())),
                        "le champ " + f.getName() + " est un tableau public : n'importe qui peut écrire dedans");
            }
        });

        Spec.test("CODES est une liste non modifiable", () -> {
            Field f = Currencies.class.getField("CODES");
            Spec.check(List.class.isAssignableFrom(f.getType()), "CODES doit être une List<String>, pas " + f.getType().getSimpleName());
            @SuppressWarnings("unchecked") List<String> codes = (List<String>) f.get(null);
            Spec.eq(codes, List.of("EUR", "USD", "GBP", "CHF", "JPY"), "CODES");
            Spec.raises(UnsupportedOperationException.class, () -> codes.set(0, "XXX"), "CODES.set(0, \"XXX\")");
        });

        Spec.test("codesArray renvoie une copie", () -> {
            Method m;
            try { m = Currencies.class.getMethod("codesArray"); } catch (NoSuchMethodException e) {
                throw new Spec.Failure("il manque public static String[] codesArray()");
            }
            String[] a = (String[]) m.invoke(null);
            a[0] = "XXX";
            String[] b = (String[]) m.invoke(null);
            Spec.eq(Arrays.asList(b), List.of("EUR", "USD", "GBP", "CHF", "JPY"), "codesArray() après modification d'une copie");
            Spec.check(Currencies.isAccepted("EUR") && !Currencies.isAccepted("XXX"), "isAccepted après modification d'une copie");
        });

        Spec.done();
    }
}
