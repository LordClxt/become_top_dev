import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Test {
    static double celsius(String factory, double value) throws Throwable {
        Method m;
        try {
            m = Temperature.class.getMethod(factory, double.class);
        } catch (NoSuchMethodException e) {
            throw new Spec.Failure("il manque la fabrique statique `public static Temperature " + factory + "(double)`");
        }
        Spec.check(Modifier.isStatic(m.getModifiers()), factory + " doit être static");
        try {
            return ((Temperature) m.invoke(null, value)).celsius();
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw e.getCause();
        }
    }

    static void near(double actual, double expected, String what) {
        Spec.check(Math.abs(actual - expected) < 1e-9, what + " : obtenu " + actual + ", attendu " + expected);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("aucun constructeur public", () -> {
            Spec.check(Arrays.stream(Temperature.class.getConstructors()).findAny().isEmpty(),
                    "new Temperature(…) compile encore depuis l'extérieur : rends le constructeur privé");
        });

        Spec.test("ofCelsius garde la valeur", () -> near(celsius("ofCelsius", 21.5), 21.5, "ofCelsius(21.5)"));

        Spec.test("ofFahrenheit convertit", () -> {
            near(celsius("ofFahrenheit", 212), 100, "ofFahrenheit(212)");
            near(celsius("ofFahrenheit", 32), 0, "ofFahrenheit(32)");
            near(celsius("ofFahrenheit", -40), -40, "ofFahrenheit(-40)");
        });

        Spec.test("ofKelvin convertit", () -> {
            near(celsius("ofKelvin", 0), -273.15, "ofKelvin(0)");
            near(celsius("ofKelvin", 373.15), 100, "ofKelvin(373.15)");
        });

        Spec.test("le zéro absolu est une borne, quelle que soit l'unité", () -> {
            Spec.raises(IllegalArgumentException.class, () -> celsius("ofCelsius", -300), "ofCelsius(-300)");
            Spec.raises(IllegalArgumentException.class, () -> celsius("ofKelvin", -1), "ofKelvin(-1)");
            Spec.raises(IllegalArgumentException.class, () -> celsius("ofFahrenheit", -500), "ofFahrenheit(-500)");
            near(celsius("ofCelsius", -273.15), -273.15, "ofCelsius(-273.15) est permis");
        });

        Spec.done();
    }
}
