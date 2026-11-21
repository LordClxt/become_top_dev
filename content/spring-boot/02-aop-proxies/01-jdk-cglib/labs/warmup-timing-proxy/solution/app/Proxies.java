package app;

import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;

/** Fabrique des proxies qui mesurent la durée de chaque appel. */
public final class Proxies {
    private Proxies() { }

    @SuppressWarnings("unchecked")
    public static <T> T timed(T target, Ticker ticker, Metrics metrics) {
        String owner = target.getClass().getSimpleName();
        // ProxyFactory choisit seule : proxy JDK si la cible a des interfaces, sous-classe CGLIB sinon.
        ProxyFactory factory = new ProxyFactory(target);
        factory.addAdvice((MethodInterceptor) invocation -> {
            long start = ticker.millis();
            try {
                return invocation.proceed();
            } finally {
                // finally : un appel qui échoue a aussi une durée.
                metrics.record(owner + "." + invocation.getMethod().getName(), ticker.millis() - start);
            }
        });
        return (T) factory.getProxy();
    }
}
