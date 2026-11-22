package app;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

/** Les routes /admin/** exigent l'en-tête X-Admin-Token: s3cret. */
public class AdminGuard implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("s3cret".equals(request.getHeader("X-Admin-Token"))) {
            return true;
        }
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return false;
    }
}
