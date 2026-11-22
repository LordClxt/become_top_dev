package app;

import java.net.URI;
import java.time.ZonedDateTime;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.accept.StandardApiVersionDeprecationHandler;
import org.springframework.web.servlet.config.annotation.ApiVersionConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureApiVersioning(ApiVersionConfigurer versions) {
        var deprecation = new StandardApiVersionDeprecationHandler();
        deprecation.configureVersion("1")
                .setDeprecationDate(ZonedDateTime.parse("2026-12-01T00:00:00Z"))
                .setSunsetDate(ZonedDateTime.parse("2027-06-01T00:00:00Z"))
                .setSunsetLink(URI.create("https://tixa.example/docs/v2"));
        versions.useRequestHeader("API-Version")
                .addSupportedVersions("1", "2")
                .setDefaultVersion("1")            // les clients sans en-tête (l'app mobile, la sonde) restent en version 1
                .setDeprecationHandler(deprecation);
    }
}
