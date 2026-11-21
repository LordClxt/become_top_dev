package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

class RegistrarTest {

    static AnnotationConfigApplicationContext start(String notifiers) {
        var ctx = new AnnotationConfigApplicationContext();
        if (notifiers != null) {
            ctx.getEnvironment().getPropertySources()
                    .addFirst(new MapPropertySource("test", Map.of("tixa.notifiers", notifiers)));
        }
        ctx.register(NotifyConfig.class);
        ctx.refresh();
        return ctx;
    }

    @Test
    @DisplayName("tixa.notifiers=email,sms : un bean par canal, nommé <canal>Notifier")
    void oneBeanPerChannel() {
        try (var ctx = start("email,sms")) {
            assertThat(ctx.getBeansOfType(Notifier.class).keySet())
                    .as("noms des beans Notifier pour tixa.notifiers=email,sms")
                    .containsExactlyInAnyOrder("emailNotifier", "smsNotifier");
            assertThat(ctx.getBean("emailNotifier", Notifier.class).send("ana", "ok"))
                    .as("emailNotifier.send(\"ana\", \"ok\")").isEqualTo("email:ana:ok");
        }
    }

    @Test
    @DisplayName("les espaces autour des noms de canaux sont ignorés")
    void trimsNames() {
        try (var ctx = start(" push , email ")) {
            assertThat(ctx.getBeansOfType(Notifier.class).keySet())
                    .as("noms des beans pour tixa.notifiers=\" push , email \"")
                    .containsExactlyInAnyOrder("pushNotifier", "emailNotifier");
        }
    }

    @Test
    @DisplayName("le canal SMS consomme le quota du conteneur")
    void smsUsesContainerQuota() {
        try (var ctx = start("sms")) {
            ctx.getBean("smsNotifier", Notifier.class).send("bob", "rappel");
            assertThat(ctx.getBean(SmsQuota.class).remaining())
                    .as("quota restant après un SMS (le notifier doit utiliser le bean SmsQuota)")
                    .isEqualTo(99);
        }
    }

    @Test
    @DisplayName("le premier canal listé est le canal par défaut")
    void firstIsPrimary() {
        try (var ctx = start("push,email,sms")) {
            assertThat(ctx.getBean(Notifier.class).send("ana", "hello"))
                    .as("ctx.getBean(Notifier.class) avec tixa.notifiers=push,email,sms")
                    .isEqualTo("push:ana:hello");
        }
    }

    @Test
    @DisplayName("sans propriété (ou vide), aucun canal et l'application démarre")
    void noChannels() {
        try (var ctx = start(null)) {
            assertThat(ctx.getBeansOfType(Notifier.class)).as("notifiers sans tixa.notifiers").isEmpty();
        }
        try (var ctx = start("")) {
            assertThat(ctx.getBeansOfType(Notifier.class)).as("notifiers avec tixa.notifiers vide").isEmpty();
        }
    }

    @Test
    @DisplayName("un canal inconnu fait échouer le démarrage avec un message clair")
    void unknownChannelFailsFast() {
        assertThatThrownBy(() -> start("email,fax").close())
                .as("démarrage avec tixa.notifiers=email,fax")
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("canal de notification inconnu : fax (connus : email, push, sms)");
    }
}
