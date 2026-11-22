package app;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.ApiVersionConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final CustomerDirectory customers;

    public WebConfig(CustomerDirectory customers) {
        this.customers = customers;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentCustomerResolver(customers));
    }

    @Override
    public void configureApiVersioning(ApiVersionConfigurer versions) {
        versions.useRequestHeader("API-Version").addSupportedVersions("1", "2").setDefaultVersion("1");
    }
}
