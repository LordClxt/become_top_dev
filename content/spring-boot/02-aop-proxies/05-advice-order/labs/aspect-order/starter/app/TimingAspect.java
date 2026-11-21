package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

/** Ouvre et ferme une mesure. Ne modifie que son ordre. */
@Aspect
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
