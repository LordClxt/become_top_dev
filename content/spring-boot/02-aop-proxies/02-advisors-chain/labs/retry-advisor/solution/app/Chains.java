package app;

import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;

/** Assemble les proxies de Tixa. */
public final class Chains {
    private Chains() { }

    @SuppressWarnings("unchecked")
    public static <T> T resilient(T target, Ticker ticker, Metrics metrics) {
        String owner = target.getClass().getSimpleName();
        ProxyFactory factory = new ProxyFactory(target);
        // L'ordre d'ajout est l'ordre d'exécution : la mesure enveloppe le retry, donc compte toutes les tentatives.
        factory.addAdvice((MethodInterceptor) invocation -> {
            long start = ticker.millis();
            try {
                return invocation.proceed();
            } finally {
                metrics.record(owner + "." + invocation.getMethod().getName(), ticker.millis() - start);
            }
        });
        factory.addAdvisor(new RetryAdvisor());
        return (T) factory.getProxy();
    }
}
