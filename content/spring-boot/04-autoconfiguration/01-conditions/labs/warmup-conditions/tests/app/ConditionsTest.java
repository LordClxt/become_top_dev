package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

class ConditionsTest {

    final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(PaymentAutoConfiguration.class));

    @Configuration(proxyBeanMethods = false)
    static class TeamGateway {
        @Bean PaymentGateway teamGateway() { return () -> "équipe"; }
    }

    @Test
    @DisplayName("avec le SDK Lydia : la passerelle Lydia, et pas de factice")
    void lydiaWhenSdkPresent() {
        runner.run(ctx -> assertThat(ctx.getBean(PaymentGateway.class).name()).as("passerelle avec le SDK").isEqualTo("lydia"));
    }

    @Test
    @DisplayName("sans le SDK Lydia : la passerelle factice")
    void fakeWhenSdkMissing() {
        runner.withClassLoader(new FilteredClassLoader("sdk.lydia")).run(ctx ->
                assertThat(ctx.getBean(PaymentGateway.class).name()).as("passerelle sans le SDK").isEqualTo("factice"));
    }

    @Test
    @DisplayName("une passerelle de l'application remplace la factice")
    void userGatewayWins() {
        runner.withClassLoader(new FilteredClassLoader("sdk.lydia")).withUserConfiguration(TeamGateway.class).run(ctx ->
                assertThat(ctx.getBean(PaymentGateway.class).name()).as("passerelle avec celle de l'équipe").isEqualTo("équipe"));
    }

    @Test
    @DisplayName("l'audit n'existe que si tixa.audit.enabled=true")
    void auditOnlyWhenEnabled() {
        runner.run(ctx -> assertThat(ctx).as("contexte sans propriété").doesNotHaveBean(AuditLog.class));
        runner.withPropertyValues("tixa.audit.enabled=false").run(ctx -> assertThat(ctx).as("contexte avec false").doesNotHaveBean(AuditLog.class));
        runner.withPropertyValues("tixa.audit.enabled=true").run(ctx -> assertThat(ctx).as("contexte avec true").hasSingleBean(AuditLog.class));
    }
}
