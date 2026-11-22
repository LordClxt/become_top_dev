package tixa.payment;

import tixa.metrics.MeterSink;

/** Enregistre les compteurs du client dans le MeterSink. Fourni : ne pas modifier. */
public class PaymentMetrics {
    public PaymentMetrics(PaymentClient client, MeterSink sink) {
        sink.register("tixa.payment.calls[" + client.endpoint() + "]");
    }
}
