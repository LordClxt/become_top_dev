package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(SearchController.class)
@Import(EventCatalog.class)
class SearchTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("sans critère : page 0, taille 20, tout le catalogue trié par date")
    void defaults() {
        var json = assertThat(mvc.get().uri("/events/search")).hasStatusOk().bodyJson();
        json.extractingPath("$.page").isEqualTo(0);
        json.extractingPath("$.size").isEqualTo(20);
        json.extractingPath("$.total").isEqualTo(12);
        json.extractingPath("$.items[0].title").isEqualTo("Chorégies d'Orange");
        json.extractingPath("$.items[11].title").isEqualTo("Fête des Lumières");
    }

    @Test
    @DisplayName("filtre par ville")
    void byCity() {
        assertThat(mvc.get().uri("/events/search?city=Lyon")).hasStatusOk().bodyJson()
                .extractingPath("$.items[*].title").asArray()
                .containsExactly("Nuits de Fourvière", "Woodstower", "Fête des Lumières");
    }

    @Test
    @DisplayName("période, bornes incluses")
    void byPeriod() {
        assertThat(mvc.get().uri("/events/search?from=2026-07-09&to=2026-07-11")).hasStatusOk().bodyJson()
                .extractingPath("$.items[*].title").asArray()
                .containsExactly("Musilac", "Jazz à Vienne", "Les Francofolies");
    }

    @Test
    @DisplayName("pagination : page 2 de 5 éléments")
    void paging() {
        var json = assertThat(mvc.get().uri("/events/search?size=5&page=2")).hasStatusOk().bodyJson();
        json.extractingPath("$.items").asArray().hasSize(2);
        json.extractingPath("$.total").isEqualTo(12);
        json.extractingPath("$.page").isEqualTo(2);
    }

    @Test
    @DisplayName("tri par titre")
    void sortByTitle() {
        assertThat(mvc.get().uri("/events/search?sort=title&size=2")).hasStatusOk().bodyJson()
                .extractingPath("$.items[*].title").asArray().containsExactly("Chorégies d'Orange", "Festival d'Avignon");
    }

    private void assertInvalid(String query, String field) {
        var result = mvc.get().uri("/events/search?" + query).exchange();
        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray().contains(field);
    }

    @Test
    @DisplayName("taille hors bornes : 400 sur size")
    void sizeTooBig() {
        assertInvalid("size=51", "size");
        assertInvalid("size=0", "size");
    }

    @Test
    @DisplayName("page négative : 400 sur page")
    void negativePage() {
        assertInvalid("page=-1", "page");
    }

    @Test
    @DisplayName("tri inconnu : 400 sur sort")
    void unknownSort() {
        assertInvalid("sort=price", "sort");
    }

    @Test
    @DisplayName("date illisible : 400 sur from")
    void badDate() {
        assertInvalid("from=2026-13-01", "from");
    }

    @Test
    @DisplayName("période à l'envers : 400 en ProblemDetail, avec une erreur listée")
    void reversedPeriod() {
        var result = mvc.get().uri("/events/search?from=2026-08-01&to=2026-07-01").exchange();
        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors").asArray().isNotEmpty();
    }
}
