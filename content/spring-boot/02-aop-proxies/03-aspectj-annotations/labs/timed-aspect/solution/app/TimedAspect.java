package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

/** Mesure les méthodes annotées @Timed. */
@Aspect
public class TimedAspect {
    private final Metrics metrics;
    private final Ticker ticker;

    public TimedAspect(Metrics metrics, Ticker ticker) {
        this.metrics = metrics;
        this.ticker = ticker;
    }

    // « @annotation(timed) » : lie l'annotation de la méthode au paramètre timed, sans réflexion à la main.
    @Around("@annotation(timed)")
    public Object measure(ProceedingJoinPoint call, Timed timed) throws Throwable {
        long start = ticker.millis();
        String outcome = "erreur";
        try {
            Object result = call.proceed();
            outcome = "ok";
            return result;
        } finally {
            metrics.record(timed.value(), outcome, ticker.millis() - start);
        }
    }
}
