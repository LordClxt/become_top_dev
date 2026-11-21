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

    // TODO : enregistrer FeatureTogglePostProcessor
}
