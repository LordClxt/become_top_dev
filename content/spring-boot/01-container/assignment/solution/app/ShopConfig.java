package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan
public class ShopConfig {

    @Bean
    @Feature("gift-cards")
    GiftCards giftCards() {
        return new GiftCards();
    }

    // static : le post-processor est créé très tôt (phase invokeBeanFactoryPostProcessors), sans instancier
    // ShopConfig ni rien de ce dont ShopConfig dépend.
    @Bean
    static FeatureTogglePostProcessor featureTogglePostProcessor() {
        return new FeatureTogglePostProcessor();
    }
}
