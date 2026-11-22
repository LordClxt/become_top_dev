package app;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** La traduction des erreurs de l'API. */
@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(Exception.class)
    ResponseEntity<String> any(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur : " + ex.getMessage());
    }
}
