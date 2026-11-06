import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class Test {
    static Class<?> type(String name) {
        try { return Class.forName(name); } catch (ClassNotFoundException e) { throw new Spec.Failure("il manque le type " + name); }
    }

    /** Construit un record par réflexion et renvoie l'exception éventuelle du constructeur compact. */
    static Object make(String name, Object... args) throws Throwable {
        Class<?> c = type(name);
        Spec.check(c.isRecord(), name + " doit être un record");
        Class<?>[] types = Arrays.stream(c.getRecordComponents()).map(rc -> rc.getType()).toArray(Class<?>[]::new);
        Constructor<?> k = c.getDeclaredConstructor(types);
        k.setAccessible(true);
        try { return k.newInstance(args); } catch (InvocationTargetException e) { throw e.getCause(); }
    }

    static Object get(Object o, String component) throws Exception {
        var m = o.getClass().getDeclaredMethod(component);
        m.setAccessible(true);
        return m.invoke(o);
    }

    static void components(String name, String expected) {
        String got = Arrays.stream(type(name).getRecordComponents()).map(rc -> rc.getType().getSimpleName() + " " + rc.getName())
                .collect(Collectors.joining(", "));
        Spec.eq(got, expected, "composants de " + name);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("une interface scellée à trois variantes", () -> {
            Spec.check(PaymentResult.class.isInterface(), "PaymentResult doit être une interface");
            Spec.check(PaymentResult.class.isSealed(), "PaymentResult doit être scellée (sealed)");
            Set<String> permitted = Arrays.stream(PaymentResult.class.getPermittedSubclasses()).map(Class::getSimpleName).collect(Collectors.toSet());
            Spec.eq(permitted, Set.of("Approved", "Declined", "Pending"), "sous-types permis");
            for (String n : List.of("Approved", "Declined", "Pending")) {
                Spec.check(type(n).isRecord(), n + " doit être un record");
                Spec.check(PaymentResult.class.isAssignableFrom(type(n)), n + " doit implémenter PaymentResult");
            }
            components("Approved", "String authCode, long amountCents");
            components("Declined", "String reason, boolean retryable");
            components("Pending", "String redirectUrl");
        });

        Spec.test("Approved refuse les états invalides", () -> {
            Object ok = make("Approved", "A1B2C3", 1250L);
            Spec.eq(get(ok, "authCode"), "A1B2C3", "authCode()");
            Spec.raises(IllegalArgumentException.class, () -> make("Approved", "a1b2c3", 1250L), "code en minuscules");
            Spec.raises(IllegalArgumentException.class, () -> make("Approved", "A1B2C", 1250L), "code de 5 caractères");
            Spec.raises(IllegalArgumentException.class, () -> make("Approved", "A1B2C3", 0L), "montant nul");
            Spec.raises(NullPointerException.class, () -> make("Approved", null, 10L), "code null");
        });

        Spec.test("Declined et Pending refusent les états invalides", () -> {
            Spec.eq(get(make("Declined", "expired_card", false), "retryable"), false, "retryable()");
            Spec.raises(IllegalArgumentException.class, () -> make("Declined", "   ", true), "raison blanche");
            Spec.raises(NullPointerException.class, () -> make("Declined", null, true), "raison null");
            Spec.raises(IllegalArgumentException.class, () -> make("Pending", "http://3ds.example/x"), "URL en http");
            Spec.raises(NullPointerException.class, () -> make("Pending", (Object) null), "URL null");
        });

        Spec.test("fromGateway lit les trois formes", () -> {
            Spec.eq(PaymentResult.fromGateway("OK;A1B2C3;1250"), make("Approved", "A1B2C3", 1250L), "OK;A1B2C3;1250");
            Spec.eq(PaymentResult.fromGateway("KO;insufficient_funds;true"), make("Declined", "insufficient_funds", true), "KO;insufficient_funds;true");
            Spec.eq(PaymentResult.fromGateway("KO;stolen;false"), make("Declined", "stolen", false), "KO;stolen;false");
            Spec.eq(PaymentResult.fromGateway("WAIT;https://3ds.bank.example/abc"), make("Pending", "https://3ds.bank.example/abc"), "WAIT;https://…");
        });

        Spec.test("fromGateway refuse les lignes mal formées", () -> {
            for (String bad : List.of("OK;A1B2C3", "OK;A1B2C3;12x", "OK;a1b2c3;100", "KO;stolen;yes", "KO;stolen", "KO;;true",
                    "WAIT;http://x", "WAIT;https://x;extra", "REFUND;A1B2C3;100", "", "OK;A1B2C3;100;")) {
                Spec.raises(IllegalArgumentException.class, () -> PaymentResult.fromGateway(bad), "fromGateway(\"" + bad + "\")");
            }
        });

        Spec.done();
    }

}
