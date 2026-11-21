package btd;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.platform.engine.FilterResult;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.engine.support.descriptor.ClassSource;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.PostDiscoveryFilter;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.BeanCreationException;

/**
 * Lance les tests JUnit Jupiter compilés dans un dossier et affiche chaque résultat au format
 * de `go test -json` (lignes {Action, Test, Output}), que la plateforme sait déjà lire.
 *
 * - Nom d'un test : son @DisplayName ; l'invocation d'un test paramétré devient « test/invocation ».
 * - Logs et System.out/err : capturés test par test, joints à la sortie seulement si le test échoue.
 * - Contexte Spring qui ne démarre pas : un message en français avec la cause racine et le bean en cause,
 *   au lieu de la pile d'exceptions (et du « failure threshold exceeded » répété sur les tests suivants).
 *
 * Usage : RunTests <dossier-des-classes> [préfixe…] — les préfixes filtrent les classes de test
 * par leur nom simple (ex. `M1` pour le jalon 1 d'un projet).
 */
public final class RunTests {

    public static void main(String[] args) {
        Path classes = Path.of(args[0]);
        List<String> prefixes = List.of(args).subList(1, args.length);

        PrintStream out = System.out;
        Capture capture = new Capture();
        System.setOut(capture.stream);
        System.setErr(capture.stream);

        PostDiscoveryFilter byPrefix = d -> {
            if (prefixes.isEmpty()) return FilterResult.included("all");
            Object source = d.getSource().orElse(null);
            String cls = source instanceof MethodSource m ? m.getClassName()
                    : source instanceof ClassSource c ? c.getClassName() : null;
            if (cls == null) return FilterResult.included("engine");
            String simple = cls.substring(cls.lastIndexOf('.') + 1);
            return prefixes.stream().anyMatch(simple::startsWith)
                    ? FilterResult.included("prefix") : FilterResult.excluded("prefix");
        };
        LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request()
                .selectors(DiscoverySelectors.selectClasspathRoots(Set.of(classes)))
                .filters(byPrefix)
                .build();

        JsonListener listener = new JsonListener(out, capture);
        LauncherFactory.create().execute(request, listener);
        out.flush();
        if (listener.reported == 0) {
            out.println("Aucun test trouvé : les classes de test doivent contenir des méthodes @Test (JUnit Jupiter).");
            out.flush();
            System.exit(2);
        }
        // exit explicite : un contexte Spring en cache (Tomcat, pools) garde des threads non démons.
        System.exit(listener.failures > 0 ? 1 : 0);
    }

    /** Tampon qui reçoit System.out/err (et donc les logs de Logback) pendant un test. */
    static final class Capture {
        final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        final PrintStream stream = new PrintStream(buffer, true, StandardCharsets.UTF_8);

        synchronized void reset() { buffer.reset(); }

        synchronized String take() {
            String s = buffer.toString(StandardCharsets.UTF_8);
            buffer.reset();
            return s;
        }
    }

    static final class JsonListener implements TestExecutionListener {
        private static final int MAX_LOG_LINES = 40;

        final PrintStream out;
        final Capture capture;
        int failures;
        int reported;
        private TestPlan plan;
        /** Tests paramétrés dont au moins une invocation a échoué (JUnit les dit « réussis »). */
        private final Set<String> failedParents = new HashSet<>();
        private boolean contextFailureShown;

        JsonListener(PrintStream out, Capture capture) {
            this.out = out;
            this.capture = capture;
        }

        @Override
        public void testPlanExecutionStarted(TestPlan testPlan) { plan = testPlan; }

        @Override
        public void executionStarted(TestIdentifier id) {
            if (id.isTest()) capture.reset();
        }

        @Override
        public void executionSkipped(TestIdentifier id, String reason) {
            if (!(id.getSource().orElse(null) instanceof MethodSource)) return;
            reported++;
            emit(Map.of("Action", "skip", "Test", nameOf(id)));
        }

        @Override
        public void executionFinished(TestIdentifier id, TestExecutionResult result) {
            boolean success = result.getStatus() == TestExecutionResult.Status.SUCCESSFUL;
            if (!(id.getSource().orElse(null) instanceof MethodSource)) {
                // Une classe de test (ou le moteur) qui échoue avant ses tests : @BeforeAll, initialisation statique…
                if (!success) {
                    String name = id.getDisplayName() + " : initialisation";
                    failures++;
                    reported++;
                    result.getThrowable().ifPresent(t -> emit(Map.of("Action", "output", "Test", name,
                            "Output", report(t))));
                    emit(Map.of("Action", "fail", "Test", name));
                }
                return;
            }
            String name = nameOf(id);
            reported++;
            boolean ok = success && !failedParents.contains(id.getUniqueId());
            if (!ok) plan.getParent(id).ifPresent(p -> failedParents.add(p.getUniqueId()));
            if (ok) {
                emit(Map.of("Action", "pass", "Test", name));
                return;
            }
            failures++;
            Throwable t = result.getThrowable().orElse(null);
            // Un test paramétré échoue déjà via ses invocations : pas de message en double.
            boolean container = id.isContainer() && !plan.getChildren(id).isEmpty();
            if (t != null && !container) emit(Map.of("Action", "output", "Test", name, "Output", report(t)));
            emit(Map.of("Action", "fail", "Test", name));
        }

        private String nameOf(TestIdentifier id) {
            TestIdentifier parent = plan.getParent(id).orElse(null);
            if (parent != null && parent.getSource().orElse(null) instanceof MethodSource) {
                return nameOf(parent) + "/" + id.getDisplayName();
            }
            return id.getDisplayName();
        }

        /** Les dernières lignes de logs du test, seulement s'il y en a. */
        private String logs() {
            String raw = capture.take().strip();
            if (raw.isEmpty()) return "\n";
            List<String> lines = raw.lines().toList();
            int from = Math.max(0, lines.size() - MAX_LOG_LINES);
            String head = from > 0 ? "(" + from + " lignes plus anciennes masquées)\n" : "";
            return "\n--- logs du test ---\n" + clip(head + String.join("\n", lines.subList(from, lines.size()))) + "\n";
        }

        /** Détail d'un échec, puis les logs du test (sauf s'ils ne font que répéter l'échec du contexte). */
        private String report(Throwable t) {
            String text = describe(t);
            if (text.startsWith(CONTEXT_FAILED)) {
                capture.take();
                return text + "\n";
            }
            return text + logs();
        }

        private static final String CONTEXT_FAILED = "Le contexte Spring n'a pas démarré";

        private String describe(Throwable t) {
            List<Throwable> chain = chain(t);
            Throwable root = chain.getLast();
            // Contexte de test Spring (@SpringBootTest, @SpringJUnitConfig) : mis en cache, donc partagé par les tests.
            boolean threshold = chain.stream().anyMatch(e -> String.valueOf(e.getMessage()).contains("failure threshold"));
            boolean testContext = threshold || chain.stream().anyMatch(e -> e instanceof IllegalStateException
                    && String.valueOf(e.getMessage()).startsWith("Failed to load ApplicationContext"));
            // Contexte créé par le test lui-même (new AnnotationConfigApplicationContext…) : un par test.
            // (seulement si l'exception vient de refresh() : un getBean raté après le démarrage n'en est pas un.)
            boolean beans = chain.stream().anyMatch(e -> e instanceof BeansException) && thrownByRefresh(t);
            if (testContext || beans) {
                if (testContext && (threshold || contextFailureShown)) {
                    return CONTEXT_FAILED + " : même cause que le premier test en échec.";
                }
                if (testContext) contextFailureShown = true;
                StringBuilder sb = new StringBuilder(CONTEXT_FAILED + ".\n");
                String bean = null;
                for (Throwable e : chain) if (e instanceof BeanCreationException b && b.getBeanName() != null) bean = b.getBeanName();
                if (bean != null) sb.append("  bean en cause — '").append(bean).append("'\n");
                sb.append("  cause racine — ").append(root.getClass().getSimpleName()).append(": ").append(root.getMessage());
                return clip(sb + where(root));
            }
            if (t instanceof AssertionError) return clip(String.valueOf(t.getMessage()) + where(t));
            String head = t.getClass().getSimpleName() + ": " + t.getMessage();
            if (root != t) head += "\n  cause racine — " + root.getClass().getSimpleName() + ": " + root.getMessage();
            return clip(head + where(root));
        }

        private static boolean thrownByRefresh(Throwable t) {
            for (StackTraceElement f : t.getStackTrace()) {
                if (f.getMethodName().equals("refresh")
                        && f.getClassName().equals("org.springframework.context.support.AbstractApplicationContext")) {
                    return true;
                }
            }
            return false;
        }

        private static List<Throwable> chain(Throwable t) {
            List<Throwable> chain = new ArrayList<>();
            for (Throwable e = t; e != null && !chain.contains(e); e = e.getCause()) chain.add(e);
            return chain;
        }

        /** Première ligne de la pile qui appartient au code du lab (ni le JDK, ni un framework). */
        private static String where(Throwable t) {
            for (StackTraceElement f : t.getStackTrace()) {
                String c = f.getClassName();
                if (c.startsWith("java.") || c.startsWith("jdk.") || c.startsWith("sun.") || c.startsWith("btd.")
                        || c.startsWith("org.") || c.startsWith("net.bytebuddy.") || c.startsWith("com.sun.")
                        || f.getFileName() == null || f.getLineNumber() < 0) continue;
                return "\n  à " + f.getFileName() + ":" + f.getLineNumber() + " (" + c.substring(c.lastIndexOf('.') + 1)
                        + "." + f.getMethodName() + ")";
            }
            return "";
        }

        /** Le toString() d'un objet Spring (contexte, réponse MockMvc…) peut faire des milliers de caractères. */
        private static String clip(String s) {
            String lines = String.join("\n", s.lines().map(l -> l.length() > 400 ? l.substring(0, 400) + " …" : l).toList());
            return lines.length() > 4000 ? lines.substring(0, 4000) + "\n…(sortie tronquée)" : lines;
        }

        private void emit(Map<String, String> line) {
            StringBuilder sb = new StringBuilder("{");
            for (String key : List.of("Action", "Test", "Output")) {
                String v = line.get(key);
                if (v == null) continue;
                if (sb.length() > 1) sb.append(',');
                sb.append('"').append(key).append("\":\"").append(escape(v)).append('"');
            }
            out.println(sb.append('}'));
        }

        private static String escape(String s) {
            StringBuilder sb = new StringBuilder(s.length() + 16);
            for (char c : s.toCharArray()) {
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> {
                        if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                        else sb.append(c);
                    }
                }
            }
            return sb.toString();
        }
    }
}
