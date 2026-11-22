import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

/** Lance les vérifications annotées d'une classe. */
public final class MiniRunner {
    private MiniRunner() { }

    public static Report run(Class<?> type) throws Exception {
        int passed = 0;
        List<String> problems = new ArrayList<>();
        for (Method m : type.getDeclaredMethods()) {
            if (m.isAnnotationPresent(Check.class)) {
                try {
                    m.invoke(null);
                    passed++;
                } catch (InvocationTargetException e) {
                    problems.add(m.getName() + " : " + e.getCause().getClass().getSimpleName() + " " + e.getCause().getMessage());
                }
            }
            if (m.isAnnotationPresent(ExpectThrows.class)) {
                Class<? extends Throwable>[] expected = m.getAnnotation(ExpectThrows.class).value();
                try {
                    m.invoke(null);
                    problems.add(m.getName() + " : aucune exception");
                } catch (InvocationTargetException e) {
                    boolean ok = false;
                    for (Class<? extends Throwable> t : expected) if (t.isInstance(e)) ok = true;
                    if (ok) passed++;
                    else problems.add(m.getName() + " : " + e.getClass().getSimpleName() + " inattendue");
                }
            }
        }
        return new Report(passed, problems.size(), problems);
    }
}
