package app;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.core.annotation.Order;

/** Journal d'audit : une ligne par appel, avec le résultat final. */
@Aspect
@Order(1)   // le plus externe : il voit l'appel une seule fois, et son résultat final
public class AuditAspect {
    private final Trace trace;

    public AuditAspect(Trace trace) { this.trace = trace; }

    @Before("@annotation(app.Booking)")
    public void start(JoinPoint call) {
        trace.add("audit appel " + call.getSignature().getName() + "(" + call.getArgs()[0] + ")");
    }

    @AfterReturning(pointcut = "@annotation(app.Booking)", returning = "result")
    public void ok(Object result) {
        trace.add("audit ok " + result);
    }

    @AfterThrowing(pointcut = "@annotation(app.Booking)", throwing = "error")
    public void failed(RuntimeException error) {
        trace.add("audit échec " + error.getMessage());
    }
}
