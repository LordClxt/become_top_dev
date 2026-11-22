package app;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

public class CurrentCustomerResolver implements HandlerMethodArgumentResolver {
    private final CustomerDirectory directory;

    public CurrentCustomerResolver(CustomerDirectory directory) {
        this.directory = directory;
    }

    @Override
    public boolean supportsParameter(MethodParameter p) {
        return p.hasParameterAnnotation(CurrentCustomer.class) && p.getParameterType() == Customer.class;
    }

    @Override
    public Object resolveArgument(MethodParameter p, ModelAndViewContainer mav, NativeWebRequest request, WebDataBinderFactory binders) {
        return directory.find(request.getHeader("X-Customer-Id"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "client non identifié"));
    }
}
