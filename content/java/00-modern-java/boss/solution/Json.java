import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.SequencedMap;

/** Une valeur JSON typée et immuable. */
sealed interface Json permits JNull, JBool, JNumber, JString, JArray, JObject {

    static Json parse(String text) {
        return new Parser(Objects.requireNonNull(text, "text")).document();
    }

    static Json from(Object value) {
        return switch (value) {
            case null -> new JNull();
            case Json j -> j;
            case Boolean b -> new JBool(b);
            case String s -> new JString(s);
            case Byte n -> new JNumber(BigDecimal.valueOf(n));
            case Short n -> new JNumber(BigDecimal.valueOf(n));
            case Integer n -> new JNumber(BigDecimal.valueOf(n));
            case Long n -> new JNumber(BigDecimal.valueOf(n));
            case BigInteger n -> new JNumber(new BigDecimal(n));
            case BigDecimal n -> new JNumber(n);
            case Double d when Double.isFinite(d) -> new JNumber(BigDecimal.valueOf(d));
            case Float f when Float.isFinite(f) -> new JNumber(new BigDecimal(Float.toString(f)));
            case Double _, Float _ -> throw new IllegalArgumentException("nombre non fini : " + value);
            case List<?> list -> new JArray(list.stream().map(Json::from).toList());
            case Map<?, ?> map -> {
                var members = new LinkedHashMap<String, Json>();
                map.forEach((k, v) -> {
                    if (!(k instanceof String key)) throw new IllegalArgumentException("clé non String : " + k);
                    members.put(key, from(v));
                });
                yield new JObject(members);
            }
            default -> throw new IllegalArgumentException("type non convertible en JSON : " + value.getClass().getName());
        };
    }

    default String render() {
        var out = new StringBuilder();
        Renderer.render(this, out);
        return out.toString();
    }

    default Optional<Json> at(String path) {
        Json current = this;
        for (Object step : Path.parse(path)) {
            Json here = current;   // une garde ne lit que des variables effectivement finales
            Optional<Json> next = switch (step) {
                case String key when here instanceof JObject(var members) -> Optional.ofNullable(members.get(key));
                case Integer i when here instanceof JArray(var elements) -> i < elements.size() ? Optional.of(elements.get(i)) : Optional.empty();
                default -> Optional.empty();   // mauvais type à cet endroit du chemin
            };
            if (next.isEmpty()) return next;
            current = next.get();
        }
        return Optional.of(current);
    }
}

record JNull() implements Json { }

record JBool(boolean value) implements Json { }

record JNumber(BigDecimal value) implements Json {
    JNumber {
        value = value.signum() == 0 ? BigDecimal.ZERO : value.stripTrailingZeros();   // 1.50 == 1.5 == 15e-1
    }
}

record JString(String value) implements Json {
    JString { Objects.requireNonNull(value, "value"); }
}

record JArray(List<Json> elements) implements Json {
    JArray { elements = List.copyOf(elements); }   // NPE pour un élément null
}

record JObject(SequencedMap<String, Json> members) implements Json {
    JObject {
        var copy = new LinkedHashMap<String, Json>(members.size() * 2);
        members.forEach((k, v) -> copy.put(Objects.requireNonNull(k, "clé"), Objects.requireNonNull(v, "valeur de " + k)));
        members = Collections.unmodifiableSequencedMap(copy);
    }
}

/** Écriture compacte, sans récursion sur la pile Java pour les chaînes. */
final class Renderer {
    private Renderer() { }

    static void render(Json json, StringBuilder out) {
        switch (json) {
            case JNull() -> out.append("null");
            case JBool(boolean b) -> out.append(b);
            case JNumber(BigDecimal n) -> out.append(n.toPlainString());
            case JString(String s) -> string(s, out);
            case JArray(List<Json> elements) -> {
                out.append('[');
                for (int i = 0; i < elements.size(); i++) {
                    if (i > 0) out.append(',');
                    render(elements.get(i), out);
                }
                out.append(']');
            }
            case JObject(SequencedMap<String, Json> members) -> {
                out.append('{');
                boolean first = true;
                for (var e : members.entrySet()) {
                    if (!first) out.append(',');
                    first = false;
                    string(e.getKey(), out);
                    out.append(':');
                    render(e.getValue(), out);
                }
                out.append('}');
            }
        }
    }

    static void string(String s, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append("\\u%04x".formatted((int) c));
                    else out.append(c);
                }
            }
        }
        out.append('"');
    }
}

/** Analyse d'un chemin : String pour une clé, Integer pour un indice. */
final class Path {
    private Path() { }

    static List<Object> parse(String path) {
        List<Object> steps = new ArrayList<>();
        int i = 0, n = path.length();
        boolean expectKey = !path.isEmpty() && path.charAt(0) != '[';
        while (i < n) {
            if (expectKey) {
                int start = i;
                while (i < n && path.charAt(i) != '.' && path.charAt(i) != '[') i++;
                if (i == start) throw new IllegalArgumentException("clé vide dans le chemin : " + path);
                steps.add(path.substring(start, i));
                expectKey = false;
            } else if (path.charAt(i) == '[') {
                int close = path.indexOf(']', i);
                if (close < 0) throw new IllegalArgumentException("crochet non fermé : " + path);
                String digits = path.substring(i + 1, close);
                if (!digits.matches("0|[1-9][0-9]{0,8}")) throw new IllegalArgumentException("indice invalide : " + path);
                steps.add(Integer.parseInt(digits));
                i = close + 1;
            } else if (path.charAt(i) == '.') {
                i++;
                if (i == n) throw new IllegalArgumentException("chemin terminé par un point : " + path);
                expectKey = true;
            } else {
                throw new IllegalArgumentException("caractère inattendu dans le chemin : " + path);
            }
        }
        return steps;
    }
}

/** Analyseur descendant récursif. */
final class Parser {
    private final String text;
    private int pos;

    Parser(String text) { this.text = text; }

    Json document() {
        Json value = value();
        skipSpaces();
        if (pos != text.length()) throw error("texte après la valeur");
        return value;
    }

    private Json value() {
        skipSpaces();
        if (pos >= text.length()) throw error("valeur attendue");
        return switch (text.charAt(pos)) {
            case '{' -> object();
            case '[' -> array();
            case '"' -> new JString(string());
            case 't' -> literal("true", new JBool(true));
            case 'f' -> literal("false", new JBool(false));
            case 'n' -> literal("null", new JNull());
            case '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' -> number();
            default -> throw error("valeur attendue");
        };
    }

    private Json object() {
        pos++;   // {
        var members = new LinkedHashMap<String, Json>();
        skipSpaces();
        if (peek() == '}') { pos++; return new JObject(members); }
        while (true) {
            skipSpaces();
            if (peek() != '"') throw error("clé attendue");
            int keyAt = pos;
            String key = string();
            skipSpaces();
            expect(':');
            Json v = value();
            if (members.putIfAbsent(key, v) != null) { pos = keyAt; throw error("clé en double : " + key); }
            skipSpaces();
            if (peek() == ',') { pos++; continue; }
            expect('}');
            return new JObject(members);
        }
    }

    private Json array() {
        pos++;   // [
        var elements = new ArrayList<Json>();
        skipSpaces();
        if (peek() == ']') { pos++; return new JArray(elements); }
        while (true) {
            elements.add(value());
            skipSpaces();
            if (peek() == ',') { pos++; continue; }
            expect(']');
            return new JArray(elements);
        }
    }

    private String string() {
        pos++;   // "
        var out = new StringBuilder();
        while (true) {
            if (pos >= text.length()) throw error("chaîne non terminée");
            char c = text.charAt(pos);
            if (c == '"') { pos++; return out.toString(); }
            if (c < 0x20) throw error("caractère de contrôle dans une chaîne");
            if (c != '\\') { out.append(c); pos++; continue; }
            pos++;
            if (pos >= text.length()) throw error("échappement incomplet");
            char e = text.charAt(pos);
            switch (e) {
                case '"', '\\', '/' -> out.append(e);
                case 'b' -> out.append('\b');
                case 'f' -> out.append('\f');
                case 'n' -> out.append('\n');
                case 'r' -> out.append('\r');
                case 't' -> out.append('\t');
                case 'u' -> {
                    if (pos + 4 >= text.length()) { pos = text.length(); throw error("échappement \\u incomplet"); }
                    int code = 0;
                    for (int k = 1; k <= 4; k++) {
                        int d = Character.digit(text.charAt(pos + k), 16);
                        if (d < 0) { pos += k; throw error("chiffre hexadécimal attendu"); }
                        code = code * 16 + d;
                    }
                    out.append((char) code);
                    pos += 4;
                }
                default -> throw error("échappement inconnu");
            }
            pos++;
        }
    }

    private Json number() {
        int start = pos;
        if (peek() == '-') pos++;
        if (peek() == '0') {
            pos++;
        } else if (isDigit(peek())) {
            while (isDigit(peek())) pos++;
        } else {
            throw error("chiffre attendu");
        }
        if (peek() == '.') {
            pos++;
            if (!isDigit(peek())) throw error("chiffre attendu après le point");
            while (isDigit(peek())) pos++;
        }
        if (peek() == 'e' || peek() == 'E') {
            pos++;
            if (peek() == '+' || peek() == '-') pos++;
            if (!isDigit(peek())) throw error("chiffre attendu dans l'exposant");
            while (isDigit(peek())) pos++;
        }
        return new JNumber(new BigDecimal(text.substring(start, pos)));
    }

    private Json literal(String word, Json value) {
        for (int k = 0; k < word.length(); k++) {
            if (pos + k >= text.length() || text.charAt(pos + k) != word.charAt(k)) { pos += k; throw error(word + " attendu"); }
        }
        pos += word.length();
        return value;
    }

    private void expect(char c) {
        if (peek() != c) throw error("'" + c + "' attendu");
        pos++;
    }

    private char peek() { return pos < text.length() ? text.charAt(pos) : '\0'; }

    private static boolean isDigit(char c) { return c >= '0' && c <= '9'; }

    private void skipSpaces() {
        while (pos < text.length()) {
            char c = text.charAt(pos);
            if (c != ' ' && c != '\t' && c != '\n' && c != '\r') return;
            pos++;
        }
    }

    private JsonException error(String message) {
        return new JsonException(message, Math.min(pos, text.length()));
    }
}
