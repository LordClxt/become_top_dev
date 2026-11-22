package app;

import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

final class Problems {
    private Problems() { }

    static ErrorResponseException of(HttpStatus status, String type, String title, String detail) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setType(URI.create("https://tixa.example/problems/" + type));
        body.setTitle(title);
        return new ErrorResponseException(status, body, null);
    }
}
