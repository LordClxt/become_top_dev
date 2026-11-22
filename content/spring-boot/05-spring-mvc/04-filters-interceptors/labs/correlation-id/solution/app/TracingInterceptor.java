package app;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Le nom du handler pour le support : seul un intercepteur le connaît, et l'en-tête se pose dans preHandle,
 * avant l'écriture du corps (dans postHandle, la réponse peut déjà être partie).
 */
public class TracingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (handler instanceof HandlerMethod method) {
            response.setHeader("X-Handler", method.getBeanType().getSimpleName() + "#" + method.getMethod().getName());
        }
        return true;
    }
}
