import groovy.json.JsonOutput

/**
 * Mini harnais de test : chaque `Spec.test` affiche des lignes JSON au format de `go test -json`,
 * ce que la plateforme sait déjà lire. Un `assert` raté affiche l'arbre des sous-expressions.
 */
class Spec {
    static int failures = 0

    static void test(String name, Closure body) {
        String problem = null
        try {
            body.call()
        } catch (Throwable t) {
            problem = t instanceof AssertionError ? t.message : "${t.getClass().simpleName}: ${t.message}"
        }
        if (problem != null) {
            failures++
            println JsonOutput.toJson([Action: 'output', Test: name, Output: problem + '\n'])
        }
        println JsonOutput.toJson([Action: problem == null ? 'pass' : 'fail', Test: name])
    }

    static void done() { System.exit(failures ? 1 : 0) }
}
