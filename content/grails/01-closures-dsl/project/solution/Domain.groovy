class Domain {

    static List<String> validate(Object instance) {
        Class type = instance.getClass()
        if (!type.metaClass.hasProperty(type, 'constraints')) return []
        Closure spec = type.constraints
        Validator.build(spec).validate(propertiesOf(instance), instance)
    }

    static Map<Integer, List<String>> validateAll(Collection instances) {
        Map<Integer, List<String>> result = [:]
        instances.eachWithIndex { instance, int i ->
            List<String> errors = validate(instance)
            if (errors) result[i] = errors
        }
        result
    }

    static List valid(Collection instances) {
        instances.findAll { validate(it).isEmpty() }
    }

    private static Map propertiesOf(Object instance) {
        instance.properties.findAll { k, v -> !(k in ['class', 'metaClass']) }
    }
}
