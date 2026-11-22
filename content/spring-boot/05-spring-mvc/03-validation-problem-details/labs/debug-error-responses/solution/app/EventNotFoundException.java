package app;

import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** Une erreur métier qui porte sa propre description : 404, avec un type stable que le client peut tester. */
public class EventNotFoundException extends ErrorResponseException {
    public static final URI TYPE = URI.create("https://tixa.example/problems/event-not-found");

    public EventNotFoundException(long eventId) {
        super(HttpStatus.NOT_FOUND, ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Aucun événement " + eventId), null);
        getBody().setType(TYPE);
        getBody().setTitle("Événement introuvable");
        getBody().setProperty("eventId", eventId);
    }
}
