// Génère src/lib/completion/grails-api.gen.ts : l'API Grails injectée dans les classes
// du projet (GORM, contrôleurs, validation), lue dans les sources officielles de Grails.
// Les sources sont analysées (AST Groovy), pas chargées : aucune dépendance Spring requise.
//
// Depuis frontend/, avec Groovy 4 (image du runner ou jar) :
//   groovy scripts/grails-api/gen.groovy 7.2.4 > src/lib/completion/grails-api.gen.ts
// Miroir Maven : variable MAVEN_REPO (défaut https://repo1.maven.org/maven2).

import java.util.zip.ZipInputStream
import org.codehaus.groovy.ast.ClassNode
import org.codehaus.groovy.ast.MethodNode
import org.codehaus.groovy.control.CompilationUnit
import org.codehaus.groovy.control.Phases

def version = args ? args[0] : '7.2.4'
def repo = System.getenv('MAVEN_REPO') ?: 'https://repo1.maven.org/maven2'

// Groupe d'API → [artefact Maven, fichiers source à lire].
def sources = [
    gormStatic  : [['org.apache.grails.data:grails-datamapping-core', ['org/grails/datastore/gorm/GormEntity.groovy']]],
    gormInstance: [['org.apache.grails.data:grails-datamapping-core', ['org/grails/datastore/gorm/GormEntity.groovy',
                                                                       'org/grails/datastore/gorm/GormValidateable.groovy']]],
    controller  : [['org.apache.grails:grails-controllers', ['grails/artefact/Controller.groovy',
                                                            'grails/artefact/controller/support/ResponseRenderer.groovy',
                                                            'grails/artefact/controller/support/ResponseRedirector.groovy']],
                   ['org.apache.grails:grails-rest-transforms', ['grails/artefact/controller/RestResponder.groovy']],
                   ['org.apache.grails.web:grails-web-common', ['grails/web/api/WebAttributes.groovy',
                                                               'grails/web/api/ServletAttributes.groovy']],
                   ['org.apache.grails.web:grails-web-databinding', ['grails/web/databinding/DataBinder.groovy']]],
    validateable: [['org.apache.grails:grails-validation', ['grails/validation/Validateable.groovy']]],
]

def jars = [:]
def sourceOf = { String coords, String path ->
    def bytes = jars.computeIfAbsent(coords) {
        def (group, artifact) = coords.split(':')
        new URL("${repo}/${group.replace('.', '/')}/${artifact}/${version}/${artifact}-${version}-sources.jar").bytes
    }
    def zip = new ZipInputStream(new ByteArrayInputStream(bytes))
    for (def e = zip.nextEntry; e; e = zip.nextEntry) if (e.name == path) return zip.text
    throw new IllegalStateException("${path} absent de ${coords}")
}

def classesOf = { String path, String text ->
    def cu = new CompilationUnit()
    cu.addSource(path, text)
    cu.compile(Phases.CONVERSION)
    cu.AST.classes as List<ClassNode>
}

// Plomberie interne de Grails, jamais appelée depuis le code d'un projet.
def internal = ['staticMethodMissing', 'staticPropertyMissing', 'propertyMissing', 'methodMissing', 'gormDynamicFinders',
                'gormPersistentEntity', 'initializeCommandObject', 'getExceptionHandlerMethodFor', 'clearConstraintsMapCache',
                'shouldSkipValidation', 'proxyHandler', 'rendererRegistry', 'staticApplicationContext', 'controllerClass',
                'mutex', 'currentRequestAttributes', 'grailsAttributes', 'getTemplateUri', 'getViewUri', 'instanceOf'] as Set

def type = { ClassNode t -> t.nameWithoutPackage + (t.isUsingGenerics() && t.genericsTypes ? '<' + t.genericsTypes*.name.join(', ') + '>' : '') }

def out = [:]
sources.each { group, entries ->
    def isStatic = group == 'gormStatic'
    // nom → [genre, signature la plus courte, surcharges]
    def found = new TreeMap<String, Map>()
    def add = { String n, String kind, String sig ->
        def e = found.computeIfAbsent(n) { [kind: kind, sig: sig, overloads: 0] }
        e.overloads++
        if (sig.count(',') < e.sig.count(',')) e.sig = sig
    }
    entries.each { coords, paths ->
        paths.each { path ->
            classesOf(path, sourceOf(coords, path)).each { cls ->
                cls.methods.each { MethodNode m ->
                    if (!m.public || m.name.startsWith('$') || m.name.contains('<')) return
                    if (m.isStatic() != isStatic && group.startsWith('gorm')) return
                    if (m.annotations.any { it.classNode.nameWithoutPackage in ['Deprecated', 'Internal'] }) return
                    if (m.name.startsWith('set') && m.parameters.length == 1) return
                    def params = m.parameters.collect { "${type(it.type)} ${it.name}" }.join(', ')
                    // Accesseurs sans paramètre : en Groovy on écrit `params`, `request`, `errors`…
                    def prop = (m.name =~ /^(?:get|is)([A-Z]\w*)$/)
                    def isProp = prop && !m.parameters
                    def name = isProp ? prop[0][1].uncapitalize() : m.name
                    if (name in internal) return
                    if (isProp) add(name, 'property', type(m.returnType))
                    else add(name, 'method', "(${params}) ${type(m.returnType)}")
                }
            }
        }
    }
    out[group] = found.collect { n, e -> [n, e.kind, e.sig + (e.overloads > 1 ? " (+${e.overloads - 1})" : '')] }
}

def toJson
toJson = { v ->
    if (v instanceof Map) return '{' + v.collect { k, x -> toJson(k.toString()) + ':' + toJson(x) }.join(',') + '}'
    if (v instanceof Collection) return '[' + v.collect { toJson(it) }.join(',') + ']'
    '"' + v.toString().replace('\\', '\\\\').replace('"', '\\"') + '"'
}

println "// Généré par scripts/grails-api (Grails ${version}) — ne pas modifier à la main."
println 'export type GrailsEntry = [name: string, kind: string, detail: string]'
println "export const GRAILS_API: Record<'gormStatic' | 'gormInstance' | 'controller' | 'validateable', GrailsEntry[]> = ${toJson(out)}"
