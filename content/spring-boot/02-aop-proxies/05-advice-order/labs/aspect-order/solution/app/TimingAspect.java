package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;

/** Ouvre et ferme une mesure. Ne modifie que son ordre. */
@Aspect
@Order(2)   // entre l'audit et le retry : une mesure couvre toutes les tentatives
public class TimingAspect {
    private final Trace trace;

    public TimingAspect(Trace trace) { this.trace = trace; }

    @Around("@annotation(app.Booking)")
    public Object time(ProceedingJoinPoint call) throws Throwable {
        trace.add("mesure début");
        try {
            return call.proceed();
        } finally {
            trace.add("mesure fin");
        }
    }
}
