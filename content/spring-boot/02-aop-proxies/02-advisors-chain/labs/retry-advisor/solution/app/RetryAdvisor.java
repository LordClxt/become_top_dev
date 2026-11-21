package app;

import java.lang.reflect.Method;

import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;
import org.springframework.aop.support.AopUtils;
import org.springframework.aop.support.StaticMethodMatcherPointcutAdvisor;

/** Un advisor : réessaie les méthodes annotées @Retry de la classe cible, et seulement elles. */
public class RetryAdvisor extends StaticMethodMatcherPointcutAdvisor {

    public RetryAdvisor() {
        setAdvice((MethodInterceptor) this::invokeWithRetry);
    }

    // Le pointcut : appelé une fois par méthode, résultat mis en cache par Spring.
    // getMostSpecificMethod : l'annotation est sur l'implémentation, pas sur l'interface du proxy JDK.
    @Override
    public boolean matches(Method method, Class<?> targetClass) {
        return AopUtils.getMostSpecificMethod(method, targetClass).isAnnotationPresent(Retry.class);
    }

    private Object invokeWithRetry(MethodInvocation invocation) throws Throwable {
        Method impl = AopUtils.getMostSpecificMethod(invocation.getMethod(), invocation.getThis().getClass());
        int attempts = impl.getAnnotation(Retry.class).attempts();
        RuntimeException last = null;
        for (int i = 1; i <= attempts; i++) {
            try {
                // Une MethodInvocation garde sa position : un clone repart du même point, avec les intercepteurs suivants.
                return ((org.springframework.aop.ProxyMethodInvocation) invocation).invocableClone().proceed();
            } catch (RuntimeException e) {
                last = e;
            }
        }
        throw last;
    }
}
