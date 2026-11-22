package app;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

/** Fournit le paramètre @CurrentCustomer Customer à partir de l'en-tête X-Customer-Id. */
public class CurrentCustomerResolver implements HandlerMethodArgumentResolver {
    private final CustomerDirectory directory;

    public CurrentCustomerResolver(CustomerDirectory directory) {
        this.directory = directory;
    }

    /** Critère étroit : notre annotation ET notre type. */
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentCustomer.class) && parameter.getParameterType() == Customer.class;
    }

    /** Pas de client identifié : 401, avant même d'appeler la méthode. */
    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        return directory.find(request.getHeader("X-Customer-Id"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "client non identifié"));
    }
}
