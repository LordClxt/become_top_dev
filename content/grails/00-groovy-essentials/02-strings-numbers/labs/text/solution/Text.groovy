class Text {
    static String slug(String title) {
        title.toLowerCase().replaceAll(/[^a-z0-9]+/, '-').replaceAll(/^-+|-+$/, '')
    }

    static List<Map> versions(String text) {
        (text =~ /(\d+)\.(\d+)(?:\.(\d+))?/).collect { m ->
            [major: m[1] as int, minor: m[2] as int, patch: (m[3] ?: 0) as int]
        }
    }

    static GString greeting(Map ctx) {
        "Hello ${-> ctx.name}"
    }

    static BigDecimal total(List<String> amounts) {
        amounts.collect { it as BigDecimal }.sum(0G)
    }

    static boolean isHexColor(String s) {
        s ==~ /#[0-9a-fA-F]{6}/
    }
}
