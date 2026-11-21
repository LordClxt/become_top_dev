package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

class ScopeGuardTest {

    /** Une classe qui ne doit jamais être instanciée : le garde-fou travaille avant toute création. */
    static class Forbidden {
        Forbidden() { throw new AssertionError("le garde-fou a provoqué la création d'un bean : il doit travailler sur les définitions"); }
    }

    // ---------- des configurations saines ----------
    static class Repo { }
    static class Cart { final Repo repo; Cart(Repo repo) { this.repo = repo; } }
    static class Desk { final ObjectProvider<Cart> carts; Desk(ObjectProvider<Cart> carts) { this.carts = carts; } }
    static class Report { final Repo repo; Report(Repo repo) { this.repo = repo; } }

    @Configuration
    static class Healthy {
        @Bean Repo repo() { return new Repo(); }
        @Bean @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE) Cart cart(Repo repo) { return new Cart(repo); }
        @Bean Desk desk(ObjectProvider<Cart> carts) { return new Desk(carts); }
        @Bean Report report(Repo repo) { return new Report(repo); }
    }

    // ---------- un singleton @Bean qui reçoit un prototype ----------
    static class SeatHold extends Forbidden { }
    static class HoldDesk extends Forbidden { HoldDesk(SeatHold hold) { } }

    @Configuration
    static class BadBeanMethod {
        @Bean @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE) SeatHold seatHold() { return new SeatHold(); }
        @Bean HoldDesk holdDesk(SeatHold seatHold) { return new HoldDesk(seatHold); }
    }

    // ---------- des composants, et une dépendance par interface ----------
    interface Job { }

    @Component @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    static class ExportJob extends Forbidden implements Job { }

    @Component
    static class ReportService extends Forbidden { ReportService(Job job) { } }

    @Component
    static class Scheduler extends Forbidden {
        Scheduler() { }
        @org.springframework.beans.factory.annotation.Autowired Scheduler(ExportJob job, Repo repo) { }
    }

    @Test
    @DisplayName("une configuration saine démarre normalement (prototype via ObjectProvider)")
    void healthyStarts() {
        try (var ctx = new AnnotationConfigApplicationContext(ScopeGuard.class, Healthy.class)) {
            Desk desk = ctx.getBean(Desk.class);
            assertThat(desk.carts.getObject()).as("deux paniers demandés au guichet").isNotSameAs(desk.carts.getObject());
        }
    }

    @Test
    @DisplayName("un singleton @Bean qui reçoit un prototype fait échouer le démarrage")
    void beanMethodViolation() {
        assertThatThrownBy(() -> new AnnotationConfigApplicationContext(ScopeGuard.class, BadBeanMethod.class).close())
                .as("démarrage de BadBeanMethod")
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("portée incohérente — un singleton reçoit un prototype une seule fois :\n"
                        + "  holdDesk ← seatHold (SeatHold)");
    }

    @Test
    @DisplayName("les composants sont vérifiés aussi, y compris par interface et par constructeur @Autowired")
    void componentViolations() {
        assertThatThrownBy(() -> new AnnotationConfigApplicationContext(ScopeGuard.class, Healthy.class,
                ExportJob.class, ReportService.class, Scheduler.class).close())
                .as("démarrage avec ExportJob (prototype), ReportService et Scheduler")
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("portée incohérente — un singleton reçoit un prototype une seule fois :\n"
                        + "  scopeGuardTest.ReportService ← scopeGuardTest.ExportJob (ExportJob)\n"
                        + "  scopeGuardTest.Scheduler ← scopeGuardTest.ExportJob (ExportJob)");
    }

    @Test
    @DisplayName("toutes les violations sont signalées d'un coup, triées")
    void allViolationsSorted() {
        assertThatThrownBy(() -> new AnnotationConfigApplicationContext(ScopeGuard.class, BadBeanMethod.class,
                ExportJob.class, ReportService.class).close())
                .as("démarrage avec deux violations")
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("portée incohérente — un singleton reçoit un prototype une seule fois :\n"
                        + "  holdDesk ← seatHold (SeatHold)\n"
                        + "  scopeGuardTest.ReportService ← scopeGuardTest.ExportJob (ExportJob)");
    }

    @Test
    @DisplayName("un prototype qui reçoit un prototype n'est pas une violation")
    void prototypeToPrototypeIsFine() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            ctx.register(ScopeGuard.class, Healthy.class);
            ctx.registerBean("audit", Report.class, bd -> bd.setScope(ConfigurableBeanFactory.SCOPE_PROTOTYPE));
            ctx.refresh();
            assertThat(ctx.getBean("audit")).as("deux audits").isNotSameAs(ctx.getBean("audit"));
        }
    }
}
