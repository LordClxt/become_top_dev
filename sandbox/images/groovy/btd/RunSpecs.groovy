package btd

import groovy.json.JsonOutput
import groovy.transform.CompileStatic
import org.junit.platform.engine.TestExecutionResult
import org.junit.platform.engine.discovery.DiscoverySelectors
import org.junit.platform.engine.support.descriptor.MethodSource
import org.junit.platform.launcher.TestExecutionListener
import org.junit.platform.launcher.TestIdentifier
import org.junit.platform.launcher.TestPlan
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder
import org.junit.platform.launcher.core.LauncherFactory

/**
 * Lance les spécifications Spock compilées dans un dossier et affiche chaque résultat
 * au format de `go test -json` (lignes {Action, Test, Output}), que la plateforme sait déjà lire.
 *
 * Nom d'un test : le nom de la fonctionnalité Spock ; une itération d'une fonctionnalité
 * paramétrée (where:) devient « fonctionnalité/itération », affichée en retrait.
 *
 * Usage : RunSpecs <dossier-des-classes> [préfixe…]  — les préfixes filtrent les classes de spec
 * par leur nom simple (ex. `M1` pour le jalon 1 d'un projet).
 */
@CompileStatic
class RunSpecs {

    static void main(String[] args) {
        File classes = new File(args[0])
        List<String> prefixes = args.length > 1 ? args[1..-1].toList() : []

        def request = LauncherDiscoveryRequestBuilder.request()
            .selectors(DiscoverySelectors.selectClasspathRoots([classes.toPath()] as Set))
            .filters(new org.junit.platform.launcher.PostDiscoveryFilter() {
                org.junit.platform.engine.FilterResult apply(org.junit.platform.engine.TestDescriptor d) {
                    if (!prefixes) return org.junit.platform.engine.FilterResult.included('all')
                    def source = d.source.orElse(null)
                    String cls = source instanceof MethodSource ? ((MethodSource) source).className
                        : source instanceof org.junit.platform.engine.support.descriptor.ClassSource
                            ? ((org.junit.platform.engine.support.descriptor.ClassSource) source).className : null
                    if (cls == null) return org.junit.platform.engine.FilterResult.included('engine')
                    String simple = cls.substring(cls.lastIndexOf('.') + 1)
                    return prefixes.any { simple.startsWith(it) }
                        ? org.junit.platform.engine.FilterResult.included('prefix')
                        : org.junit.platform.engine.FilterResult.excluded('prefix')
                }
            })
            .build()

        def listener = new JsonListener()
        LauncherFactory.create().execute(request, listener)
        System.out.flush()
        if (listener.reported == 0) {
            System.err.println('Aucun test trouvé : les spécifications doivent étendre spock.lang.Specification.')
            System.exit(2)
        }
        System.exit(listener.failures > 0 ? 1 : 0)
    }
}

@CompileStatic
class JsonListener implements TestExecutionListener {
    int failures = 0
    int reported = 0
    private TestPlan plan
    /** Fonctionnalités paramétrées dont au moins une itération a échoué (JUnit les dit « réussies »). */
    private final Set<String> failedParents = [] as Set

    void testPlanExecutionStarted(TestPlan testPlan) { plan = testPlan }

    void executionSkipped(TestIdentifier id, String reason) {
        if (!(id.source.orElse(null) instanceof MethodSource)) return
        reported++
        emit([Action: 'skip', Test: nameOf(id)])
    }

    void executionFinished(TestIdentifier id, TestExecutionResult result) {
        def source = id.source.orElse(null)
        if (!(source instanceof MethodSource)) {
            // Une spec (ou le moteur) qui échoue avant ses tests : champ @Shared, setupSpec, contexte Spring…
            // Sans ce rapport, l'erreur disparaîtrait et on ne lirait que « aucun test ».
            if (result.status != TestExecutionResult.Status.SUCCESSFUL) {
                String name = "${id.displayName} : initialisation"
                failures++
                reported++
                result.throwable.ifPresent { Throwable t -> emit([Action: 'output', Test: name, Output: describe(t) + '\n']) }
                emit([Action: 'fail', Test: name])
            }
            return
        }
        // Une fonctionnalité paramétrée est un conteneur : on ne la signale qu'une fois ses itérations jouées.
        String name = nameOf(id)
        reported++
        boolean ok = result.status == TestExecutionResult.Status.SUCCESSFUL && !failedParents.contains(id.uniqueId)
        if (!ok) plan.getParent(id).ifPresent { TestIdentifier p -> failedParents << p.uniqueId }
        if (ok) {
            emit([Action: 'pass', Test: name])
            return
        }
        failures++
        Throwable t = result.throwable.orElse(null)
        // Un conteneur échoue déjà via ses itérations : pas de message en double.
        boolean container = id.container && plan.getChildren(id).size() > 0
        if (t != null && !container) emit([Action: 'output', Test: name, Output: describe(t) + '\n'])
        emit([Action: 'fail', Test: name])
    }

    private String nameOf(TestIdentifier id) {
        TestIdentifier parent = plan.getParent(id).orElse(null)
        if (parent != null && parent.source.orElse(null) instanceof MethodSource) {
            return nameOf(parent) + '/' + id.displayName
        }
        return id.displayName
    }

    private static String describe(Throwable t) {
        // Les assertions Spock (« power assert ») portent déjà l'arbre des valeurs : on le garde tel quel.
        if (t instanceof AssertionError) return clip(t.message ?: t.toString())
        Throwable root = t
        while (root.cause != null && root.cause != root) root = root.cause
        String head = "${t.getClass().simpleName}: ${t.message}"
        return clip(root == t ? head : head + "\n  cause racine — ${root.getClass().simpleName}: ${root.message}")
    }

    /** Le toString() d'un objet Spring (réponse MockMvc, contexte…) peut faire des milliers de caractères. */
    private static String clip(String s) {
        String lines = s.readLines().collect { it.length() > 400 ? it.take(400) + ' …' : it }.join('\n')
        return lines.length() > 4000 ? lines.take(4000) + '\n…(sortie tronquée)' : lines
    }

    private static void emit(Map line) {
        System.out.println(JsonOutput.toJson(line))
    }
}
