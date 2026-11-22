package app;

import java.util.regex.Pattern;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

public class IdempotencyKeyResolver implements HandlerMethodArgumentResolver {
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9-]{8,64}");

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(IdempotencyKey.class) && parameter.getParameterType() == String.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav, NativeWebRequest request, WebDataBinderFactory binders) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || !SAFE.matcher(key).matches()) {
            throw Problems.of(HttpStatus.BAD_REQUEST, "idempotency-key-missing", "Clé d'idempotence absente ou invalide",
                    "En-tête Idempotency-Key obligatoire : 8 à 64 lettres, chiffres ou tirets");
        }
        return key;
    }
}
