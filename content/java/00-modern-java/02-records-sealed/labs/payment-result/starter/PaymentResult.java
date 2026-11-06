/** Résultat renvoyé par la passerelle de paiement. */
class PaymentResult {
    String status;       // "APPROVED", "DECLINED" ou "PENDING"
    String authCode;     // seulement si APPROVED
    long amountCents;    // seulement si APPROVED
    String reason;       // seulement si DECLINED
    boolean retryable;   // seulement si DECLINED
    String redirectUrl;  // seulement si PENDING

    // TODO : remplacer cette classe par une interface scellée et trois records (voir les consignes)
    static PaymentResult fromGateway(String line) {
        throw new UnsupportedOperationException("fromGateway");
    }
}
