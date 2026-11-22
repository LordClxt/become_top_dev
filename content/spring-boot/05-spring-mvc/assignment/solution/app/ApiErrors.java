package app;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * La traduction des erreurs de l'API, en ProblemDetail.
 * ResponseEntityExceptionHandler couvre toutes les exceptions de Spring MVC (400, 405, 415…) et les ErrorResponseException ;
 * leurs gestionnaires dédiés sont plus proches que celui d'Exception, qui ne garde que l'imprévu.
 */
@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

    /** Validation du corps : on ajoute les champs fautifs au ProblemDetail fourni par Spring. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ex.getBody();
        problem.setProperty("errors", ex.getFieldErrors().stream()
                .map(f -> Map.of("field", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
                .toList());
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    /** L'imprévu : un 500 générique avec une référence ; le détail reste dans les journaux. */
    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception ex) {
        String ref = UUID.randomUUID().toString();
        log.error("Erreur interne, référence {}", ref, ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne. Référence : " + ref);
    }
}
