class Colls {
    static Map<String, Integer> wordFrequencies(String text) {
        text.toLowerCase().findAll(/\w+/).countBy { it }.sort { a, b ->
            b.value <=> a.value ?: a.key <=> b.key
        }
    }

    static Map<String, List<String>> groupByInitial(List<String> words) {
        words.groupBy { it[0].toUpperCase() }.collectEntries { k, v -> [k, v.sort(false)] }
    }

    static Map indexBy(List<Map> rows, String key) {
        rows.collectEntries { [it[key], it] }
    }

    static List<Integer> flattenRanges(List<Range> ranges) {
        ranges.collectMany { it.toList() }.unique().sort()
    }

    static List sortedCopy(List items) {
        items.sort(false)
    }
}
