package app;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Fournit le paramètre @CurrentCustomer Customer à partir de l'en-tête X-Customer-Id. */
public class CurrentCustomerResolver implements HandlerMethodArgumentResolver {
    private final CustomerDirectory directory;

    public CurrentCustomerResolver(CustomerDirectory directory) {
        this.directory = directory;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentCustomer.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        return directory.find(request.getHeader("X-Customer-Id")).orElse(null);
    }
}
