package app;

import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Les erreurs de Spring MVC en ProblemDetail (leçon 3). */
@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler { }
