package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

/** Consigne chaque appel @Audited : « méthode(premierArgument) ok résultat » ou « … échec message ». */
@Aspect
public class AuditAspect {
    private final AuditLog log;

    public AuditAspect(AuditLog log) { this.log = log; }

    @Around("@annotation(app.Audited)")
    public Object audit(ProceedingJoinPoint call) throws Throwable {
        Object[] args = call.getArgs();
        String head = call.getSignature().getName() + "(" + (args.length == 0 ? "" : args[0]) + ")";
        try {
            Object result = call.proceed();
            log.add(head + " ok " + result);
            return result;
        } catch (RuntimeException e) {
            log.add(head + " échec " + e.getMessage());
            throw e;
        }
    }
}
