package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tixa.notify.NotificationService;
import tixa.notify.Notifier;

class NotifyStarterTest {

    /** Les autoconfigurations déclarées par le starter, lues comme le fait Spring Boot. */
    static Class<?>[] declared() throws Exception {
        var url = NotifyStarterTest.class.getClassLoader()
                .getResource("META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports");
        assertThat(url).as("fichier imports du starter").isNotNull();
        List<String> names;
        try (var in = url.openStream()) {
            names = new String(in.readAllBytes()).lines().map(String::trim).filter(l -> !l.isEmpty() && !l.startsWith("#")).toList();
        }
        Class<?>[] classes = new Class<?>[names.size()];
        for (int i = 0; i < classes.length; i++) classes[i] = Class.forName(names.get(i));
        return classes;
    }

    static ApplicationContextRunner runner() throws Exception {
        return new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(declared()));
    }

    @Configuration(proxyBeanMethods = false)
    static class TeamNotifier {
        @Bean Notifier slackNotifier() { return (to, text) -> "slack:" + to + ":" + text; }
    }

    @Test
    @DisplayName("e-mail seul (pas d'expéditeur SMS) : le service envoie par e-mail")
    void mailOnly() throws Exception {
        runner().run(ctx -> assertThat(ctx.getBean(NotificationService.class).broadcast("ana", "ok"))
                .as("envois").containsExactly("mail:ana:ok"));
    }

    @Test
    @DisplayName("e-mail et SMS configuré : les deux, e-mail d'abord")
    void mailAndSms() throws Exception {
        runner().withPropertyValues("tixa.notify.sms.sender=TIXA").run(ctx ->
                assertThat(ctx.getBean(NotificationService.class).broadcast("ana", "ok"))
                        .as("envois").containsExactly("mail:ana:ok", "sms(TIXA):ana:ok"));
    }

    @Test
    @DisplayName("aucun SDK : le canal de journal sert de repli")
    void fallback() throws Exception {
        runner().withClassLoader(new FilteredClassLoader("sdk.")).run(ctx ->
                assertThat(ctx.getBean(NotificationService.class).broadcast("ana", "ok")).as("envois").containsExactly("log:ana:ok"));
    }

    @Test
    @DisplayName("SDK SMS présent mais pas d'expéditeur : pas de SMS")
    void smsNeedsSender() throws Exception {
        runner().withClassLoader(new FilteredClassLoader("sdk.mail")).run(ctx ->
                assertThat(ctx.getBean(NotificationService.class).broadcast("ana", "ok")).as("envois").containsExactly("log:ana:ok"));
    }

    @Test
    @DisplayName("un canal de l'application, sans SDK : pas de repli, seulement le sien")
    void userNotifierReplacesFallback() throws Exception {
        runner().withClassLoader(new FilteredClassLoader("sdk.")).withUserConfiguration(TeamNotifier.class).run(ctx ->
                assertThat(ctx.getBean(NotificationService.class).broadcast("ana", "ok")).as("envois").containsExactly("slack:ana:ok"));
    }

    @Test
    @DisplayName("tixa.notify.enabled=false : rien n'est configuré")
    void disabled() throws Exception {
        runner().withPropertyValues("tixa.notify.enabled=false").run(ctx -> {
            assertThat(ctx).as("contexte désactivé").doesNotHaveBean(NotificationService.class);
            assertThat(ctx).as("contexte désactivé").doesNotHaveBean(Notifier.class);
        });
    }

    @Test
    @DisplayName("sans les SDK sur le classpath, le contexte démarre (aucune classe absente n'est chargée)")
    void startsWithoutSdks() throws Exception {
        runner().withClassLoader(new FilteredClassLoader("sdk.")).run(ctx -> assertThat(ctx).as("contexte").hasNotFailed());
    }
}
