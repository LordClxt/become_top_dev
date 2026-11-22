package tixa.notify;

import java.util.List;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import sdk.mail.MailSdk;
import sdk.sms.SmsSdk;

/** Les canaux, chacun conditionné par son SDK. Le repli et le service sont dans une autoconfiguration ultérieure. */
@AutoConfiguration
@ConditionalOnBooleanProperty(name = "tixa.notify.enabled", matchIfMissing = true)
public class NotifyAutoConfiguration {

    // Classes imbriquées : la condition de classe est lue avant que la configuration soit chargée.
    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(MailSdk.class)
    static class MailChannel {
        @Bean
        @Order(1)
        @ConditionalOnMissingBean(name = "emailNotifier")
        Notifier emailNotifier() {
            MailSdk sdk = new MailSdk();
            return sdk::send;
        }
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(SmsSdk.class)
    @ConditionalOnProperty("tixa.notify.sms.sender")
    static class SmsChannel {
        @Bean
        @Order(2)
        @ConditionalOnMissingBean(name = "smsNotifier")
        Notifier smsNotifier(org.springframework.core.env.Environment env) {
            SmsSdk sdk = new SmsSdk(env.getProperty("tixa.notify.sms.sender"));
            return sdk::send;
        }
    }

    /** Évaluée après les canaux et après la configuration de l'application : elle voit tous les Notifier. */
    @AutoConfiguration(after = NotifyAutoConfiguration.class)
    @ConditionalOnBooleanProperty(name = "tixa.notify.enabled", matchIfMissing = true)
    public static class Fallback {

        @Bean
        @ConditionalOnMissingBean(Notifier.class)
        Notifier logNotifier() {
            return (to, text) -> "log:" + to + ":" + text;
        }

        @Bean
        @ConditionalOnMissingBean
        NotificationService notificationService(List<Notifier> notifiers) {
            return new NotificationService(notifiers);
        }
    }
}
