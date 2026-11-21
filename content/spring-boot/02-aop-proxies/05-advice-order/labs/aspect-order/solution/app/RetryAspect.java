package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;

/** Réessaie jusqu'à 3 tentatives au total. Ne modifie que son ordre. */
@Aspect
@Order(3)   // le plus interne : chaque tentative ne refait que l'appel
public class RetryAspect {
    private final Trace trace;

    public RetryAspect(Trace trace) { this.trace = trace; }

    @Around("@annotation(app.Booking)")
    public Object retry(ProceedingJoinPoint call) throws Throwable {
        for (int attempt = 1; ; attempt++) {
            try {
                trace.add("tentative " + attempt);
                return call.proceed();
            } catch (IllegalStateException e) {
                if (attempt == 3) throw e;
            }
        }
    }
}
