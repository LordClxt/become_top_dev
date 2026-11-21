package app;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

/** Rejoue le résultat d'un appel @Idempotent déjà réussi avec la même clé. */
@Aspect
public class IdempotencyAspect {
    /** Clé = méthode + clé d'idempotence : la même clé sur charge et refund désigne deux opérations. */
    private record Key(String method, String idempotencyKey) { }

    private final Map<Key, Object> results = new ConcurrentHashMap<>();

    @Around("@annotation(idempotent)")
    public Object replayOrProceed(ProceedingJoinPoint call, Idempotent idempotent) throws Throwable {
        Object[] args = call.getArgs();
        int index = idempotent.keyArg();
        if (index < 0 || index >= args.length || !(args[index] instanceof String value) || value.isBlank()) {
            throw new IllegalArgumentException("clé d'idempotence absente pour " + call.getSignature().toShortString()
                    + " (argument " + index + ")");
        }
        Key key = new Key(call.getSignature().toLongString(), value);
        Object previous = results.get(key);
        if (previous != null) return previous;
        // Un échec n'est pas mémorisé : le client pourra réessayer avec la même clé.
        Object result = call.proceed();
        results.putIfAbsent(key, result);
        return results.get(key);
    }
}
