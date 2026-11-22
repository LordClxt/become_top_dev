package app;

import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** Les erreurs métier de l'API, chacune avec un type stable. */
public final class Problems {
    private Problems() { }

    public static ErrorResponseException eventNotFound(long id) {
        return problem(HttpStatus.NOT_FOUND, "event-not-found", "Événement introuvable", "Aucun événement " + id);
    }

    public static ErrorResponseException soldOut(long id, int asked) {
        var e = problem(HttpStatus.CONFLICT, "sold-out", "Plus assez de places", asked + " places demandées pour l'événement " + id);
        e.getBody().setProperty("eventId", id);
        return e;
    }

    private static ErrorResponseException problem(HttpStatus status, String type, String title, String detail) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setType(URI.create("https://tixa.example/problems/" + type));
        body.setTitle(title);
        return new ErrorResponseException(status, body, null);
    }
}
