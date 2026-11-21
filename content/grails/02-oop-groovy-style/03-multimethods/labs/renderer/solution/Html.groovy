class Html {
    static String render(Text t) { escape(t.value) }

    static String render(Code c) { "<code>${escape(c.value)}</code>" }

    static String render(Bold b) { "<strong>${render(b.children)}</strong>" }

    static String render(Link l) { "<a href=\"${escape(l.href)}\">${render(l.children)}</a>" }

    // La plus proche du type réel gagne : un ExternalLink n'arrive jamais dans render(Link).
    static String render(ExternalLink l) {
        "<a href=\"${escape(l.href)}\" rel=\"noopener\" target=\"_blank\">${render(l.children)}</a>"
    }

    static String render(List<Fragment> nodes) {
        // On filtre null avant l'appel : null n'a pas de type, Groovy choisirait une surcharge au hasard.
        nodes.findAll { it != null }.collect { render(it) }.join('')
    }

    static String render(Fragment n) {
        throw new IllegalArgumentException("nœud non géré : ${n.getClass().simpleName}")
    }

    private static String escape(String s) {
        s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
    }
}
