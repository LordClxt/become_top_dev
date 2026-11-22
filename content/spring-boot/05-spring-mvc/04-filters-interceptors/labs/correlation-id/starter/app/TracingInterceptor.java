package app;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

/** Trace chaque requête : identifiant de corrélation, et nom du handler pour le support. */
public class TracingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String id = request.getHeader("X-Request-Id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        MDC.put("requestId", id);
        request.setAttribute("requestId", id);
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView mv) {
        response.setHeader("X-Request-Id", (String) request.getAttribute("requestId"));
        if (handler instanceof HandlerMethod method) {
            response.setHeader("X-Handler", method.getBeanType().getSimpleName() + "#" + method.getMethod().getName());
        }
    }
}
