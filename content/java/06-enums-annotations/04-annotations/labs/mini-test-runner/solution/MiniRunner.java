import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/** Lance les vérifications annotées d'une classe, dans l'ordre alphabétique des méthodes. */
public final class MiniRunner {
    private MiniRunner() { }

    public static Report run(Class<?> type) {
        int passed = 0;
        List<String> problems = new ArrayList<>();
        Method[] methods = type.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));   // getDeclaredMethods n'a pas d'ordre garanti
        for (Method m : methods) {
            boolean check = m.isAnnotationPresent(Check.class);
            ExpectThrows expect = m.getAnnotation(ExpectThrows.class);
            if (!check && expect == null) continue;
            if (!Modifier.isStatic(m.getModifiers()) || m.getParameterCount() != 0) {
                problems.add(m.getName() + " : invalide");   // mauvais usage de l'annotation, pas un échec
                continue;
            }
            Throwable thrown = invoke(m);
            if (expect == null) {
                if (thrown == null) passed++;
                else problems.add(m.getName() + " : " + thrown.getClass().getSimpleName() + " " + thrown.getMessage());
            } else if (thrown == null) {
                problems.add(m.getName() + " : aucune exception");
            } else if (Arrays.stream(expect.value()).anyMatch(t -> t.isInstance(thrown))) {
                passed++;
            } else {
                problems.add(m.getName() + " : " + thrown.getClass().getSimpleName() + " inattendue");
            }
        }
        return new Report(passed, problems.size(), problems);
    }

    /** L'exception levée par la méthode elle-même (déballée), ou null. */
    private static Throwable invoke(Method m) {
        try {
            m.setAccessible(true);
            m.invoke(null);
            return null;
        } catch (InvocationTargetException e) {
            return e.getCause();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("impossible d'appeler " + m, e);
        }
    }
}
