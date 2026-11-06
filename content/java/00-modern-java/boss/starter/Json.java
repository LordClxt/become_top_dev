import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.SequencedMap;

/** Une valeur JSON typée et immuable. */
sealed interface Json permits JNull, JBool, JNumber, JString, JArray, JObject {

    static Json parse(String text) {
        throw new UnsupportedOperationException("parse");
    }

    static Json from(Object value) {
        throw new UnsupportedOperationException("from");
    }

    default String render() {
        throw new UnsupportedOperationException("render");
    }

    default Optional<Json> at(String path) {
        throw new UnsupportedOperationException("at");
    }
}

record JNull() implements Json { }

record JBool(boolean value) implements Json { }

record JNumber(BigDecimal value) implements Json { }

record JString(String value) implements Json { }

record JArray(List<Json> elements) implements Json { }

record JObject(SequencedMap<String, Json> members) implements Json { }
