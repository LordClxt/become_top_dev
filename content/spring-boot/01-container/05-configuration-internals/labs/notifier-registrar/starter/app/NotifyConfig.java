package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/** Fourni : ne pas modifier. */
@Configuration
@Import(NotifierRegistrar.class)
public class NotifyConfig {

    @Bean
    SmsQuota smsQuota() {
        return new SmsQuota(100);
    }
}
