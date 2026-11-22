package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.condition.ConditionEvaluationReport;
import org.springframework.boot.autoconfigure.condition.SpringBootCondition;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tixa.features.ConditionalOnFeature;
import tixa.features.OnFeatureCondition;

class FeatureConditionTest {

    public static class LoyaltyProgram { }
    public static class GiftCards { }

    @Configuration(proxyBeanMethods = false)
    static class Features {
        @Bean @ConditionalOnFeature("loyalty") LoyaltyProgram loyaltyProgram() { return new LoyaltyProgram(); }
        @Bean @ConditionalOnFeature("gift-cards") GiftCards giftCards() { return new GiftCards(); }
    }

    final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Features.class);

    static List<String> reportMessages(ConfigurableApplicationContext ctx) {
        List<String> messages = new ArrayList<>();
        ConditionEvaluationReport.get(ctx.getBeanFactory()).getConditionAndOutcomesBySource().values()
                .forEach(outcomes -> outcomes.forEach(o -> messages.add(o.getOutcome().getMessage())));
        return messages;
    }

    @Test
    @DisplayName("sans tixa.features : aucune fonctionnalité")
    void none() {
        runner.run(ctx -> {
            assertThat(ctx).as("contexte").doesNotHaveBean(LoyaltyProgram.class).doesNotHaveBean(GiftCards.class);
        });
    }

    @Test
    @DisplayName("seules les fonctionnalités listées existent, espaces tolérés")
    void listed() {
        runner.withPropertyValues("tixa.features=loyalty , search").run(ctx -> {
            assertThat(ctx).as("contexte").hasSingleBean(LoyaltyProgram.class).doesNotHaveBean(GiftCards.class);
        });
    }

    @Test
    @DisplayName("une fonctionnalité dont le nom en contient une autre n'est pas confondue")
    void exactMatch() {
        runner.withPropertyValues("tixa.features=gift-cards-v2").run(ctx ->
                assertThat(ctx).as("contexte avec gift-cards-v2").doesNotHaveBean(GiftCards.class));
    }

    @Test
    @DisplayName("la condition est une SpringBootCondition : son issue est dans le rapport")
    void reported() {
        assertThat(SpringBootCondition.class.isAssignableFrom(OnFeatureCondition.class)).as("OnFeatureCondition étend SpringBootCondition").isTrue();
        runner.withPropertyValues("tixa.features=loyalty").run(ctx -> {
            List<String> messages = reportMessages(ctx);
            assertThat(messages).as("messages du rapport des conditions").anyMatch(m -> m.contains("gift-cards") && m.contains("loyalty"));
        });
    }
}
