import groovy.transform.Generated
import org.codehaus.groovy.transform.trait.Traits

import java.lang.reflect.Method
import java.lang.reflect.Modifier

class Minigrails {
    private final Map<String, Class> controllers = [:]
    private final Map<String, Map<String, Method>> actionsByController = [:]

    void register(Class... types) {
        types.each { Class type ->
            if (!type.simpleName.endsWith('Controller') || !Controller.isAssignableFrom(type)) {
                throw new IllegalArgumentException("${type.name} n'est pas un contrôleur : nom en *Controller et trait Controller requis")
            }
            String name = (type.simpleName - 'Controller').uncapitalize()
            if (controllers.containsKey(name)) throw new IllegalArgumentException("contrôleur déjà enregistré : $name")
            controllers[name] = type
            actionsByController[name] = type.declaredMethods.findAll { isAction(it) }.collectEntries { [it.name, it] }
        }
    }

    List<String> getControllerNames() {
        controllers.keySet().sort()
    }

    List<String> actions(String controller) {
        (actionsByController[controller]?.keySet() ?: []).sort()
    }

    Response handle(String uri, Map query = [:]) {
        List<String> parts = uri.split('/').findAll()
        String name = parts ? parts[0] : null
        Class type = controllers[name]
        if (!type) return new Response(status: 404)
        String actionName = parts.size() > 1 ? parts[1] : defaultAction(type)
        Method action = actionsByController[name][actionName]
        if (!action) return new Response(status: 404)

        Controller controller = type.getDeclaredConstructor().newInstance() as Controller
        controller.params = new LinkedHashMap(query)
        if (parts.size() > 2) controller.params.id = parts[2]

        def result = action.invoke(controller, bind(action, controller.params) as Object[])
        Response response = controller.response
        if (!response.committed) {
            response.view = "$name/$actionName"
            response.model = result instanceof Map ? result : [:]
        }
        response
    }

    // Une action est écrite par le développeur : ni synthétique, ni générée (accesseurs), ni copiée d'un trait.
    private static boolean isAction(Method m) {
        int mod = m.modifiers
        Modifier.isPublic(mod) && !Modifier.isStatic(mod) && !m.synthetic &&
            !m.isAnnotationPresent(Generated) && !m.isAnnotationPresent(Traits.TraitBridge)
    }

    private static String defaultAction(Class type) {
        type.metaClass.hasProperty(type, 'defaultAction') ? type.defaultAction : 'index'
    }

    private static List bind(Method action, Map params) {
        action.parameters.collect { p -> convert(params[p.name], p.type) }
    }

    private static convert(value, Class type) {
        if (value == null) return null
        String s = value.toString().trim()
        switch (type) {
            case Long: return s.isLong() ? s.toLong() : null
            case Integer: return s.isInteger() ? s.toInteger() : null
            case Boolean: return s.equalsIgnoreCase('true') ? true : s.equalsIgnoreCase('false') ? false : null
            case String: return value.toString()
            default: throw new IllegalArgumentException("type de paramètre non pris en charge : ${type.simpleName}")
        }
    }
}
