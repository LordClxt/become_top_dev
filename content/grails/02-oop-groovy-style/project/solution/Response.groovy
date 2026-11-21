// Fourni : la réponse HTTP de Minigrails.
class Response {
    int status = 200
    String contentType
    String body
    String view
    Map model = [:]
    String redirectUrl
    boolean committed
}
