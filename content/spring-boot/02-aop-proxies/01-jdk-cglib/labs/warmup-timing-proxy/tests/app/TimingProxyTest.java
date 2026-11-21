package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Iterator;
import java.util.List;
import java.util.stream.LongStream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;

class TimingProxyTest {

    /** Une horloge qui renvoie 100, 130, 200, 260… : chaque appel mesuré dure 30, puis 60 ms. */
    static Ticker ticks(long... values) {
        Iterator<Long> it = LongStream.of(values).iterator();
        return it::next;
    }

    @Test
    @DisplayName("un appel passe par le proxy et sa durée est enregistrée")
    void recordsDuration() {
        Metrics metrics = new Metrics();
        Catalog catalog = Proxies.timed(new MemoryCatalog(), ticks(100, 130), metrics);
        assertThat(catalog.find("jazz")).as("résultat de find(\"jazz\") via le proxy").isEqualTo("événement jazz");
        assertThat(metrics.lines()).as("mesures après un appel").containsExactly("MemoryCatalog.find 30");
    }

    @Test
    @DisplayName("une cible qui a une interface donne un proxy JDK")
    void interfaceGivesJdkProxy() {
        Catalog catalog = Proxies.timed(new MemoryCatalog(), ticks(0, 0), new Metrics());
        assertThat(AopUtils.isJdkDynamicProxy(catalog)).as("AopUtils.isJdkDynamicProxy(proxy du catalogue)").isTrue();
    }

    @Test
    @DisplayName("une cible sans interface donne un proxy CGLIB, une sous-classe")
    void classGivesCglibProxy() {
        Metrics metrics = new Metrics();
        PriceCalculator prices = Proxies.timed(new PriceCalculator(), ticks(0, 5), metrics);
        assertThat(AopUtils.isCglibProxy(prices)).as("AopUtils.isCglibProxy(proxy du calculateur)").isTrue();
        assertThat(prices.total(4500, 2)).as("total(4500, 2)").isEqualTo(9000);
        assertThat(metrics.lines()).as("mesures").containsExactly("PriceCalculator.total 5");
    }

    @Test
    @DisplayName("une méthode final n'est pas interceptée par une sous-classe")
    void finalMethodNotIntercepted() {
        Metrics metrics = new Metrics();
        PriceCalculator prices = Proxies.timed(new PriceCalculator(), ticks(), metrics);
        assertThat(prices.fee()).as("fee()").isEqualTo(150);
        assertThat(metrics.lines()).as("mesures après fee(), méthode final").isEmpty();
    }

    @Test
    @DisplayName("un appel qui échoue est mesuré, et l'exception d'origine remonte")
    void failureIsMeasuredAndRethrown() {
        Metrics metrics = new Metrics();
        Catalog catalog = Proxies.timed(new MemoryCatalog(), ticks(200, 260), metrics);
        assertThatThrownBy(() -> catalog.find(" ")).as("find(\" \")")
                .isExactlyInstanceOf(IllegalArgumentException.class).hasMessage("identifiant vide");
        assertThat(metrics.lines()).as("mesures après un appel en échec").containsExactly("MemoryCatalog.find 60");
    }

    @Test
    @DisplayName("chaque appel est mesuré séparément")
    void eachCall() {
        Metrics metrics = new Metrics();
        Catalog catalog = Proxies.timed(new MemoryCatalog(), ticks(0, 10, 10, 15), metrics);
        catalog.find("a");
        catalog.find("b");
        assertThat(metrics.lines()).as("mesures après deux appels").isEqualTo(List.of("MemoryCatalog.find 10", "MemoryCatalog.find 5"));
    }
}
