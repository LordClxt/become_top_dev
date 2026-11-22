package app;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Les réglages de Spring MVC propres à Tixa : on ajoute à Spring Boot, on ne le remplace pas. */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final CustomerDirectory directory;

    public WebConfig(CustomerDirectory directory) {
        this.directory = directory;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentCustomerResolver(directory));
    }
}
