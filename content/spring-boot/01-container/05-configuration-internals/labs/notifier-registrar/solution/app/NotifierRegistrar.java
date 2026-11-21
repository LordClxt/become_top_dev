package app;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

import org.springframework.beans.factory.BeanRegistrar;
import org.springframework.beans.factory.BeanRegistry;
import org.springframework.core.env.Environment;

/** Enregistre un bean Notifier par canal listé dans la propriété tixa.notifiers. */
public class NotifierRegistrar implements BeanRegistrar {

    // La recette de chaque canal : elle reçoit le contexte, donc peut demander d'autres beans.
    private static final Map<String, Function<BeanRegistry.SupplierContext, Notifier>> CHANNELS = new TreeMap<>(Map.of(
            "email", ctx -> new Channels.Email(),
            "push", ctx -> new Channels.Push(),
            "sms", ctx -> new Channels.Sms(ctx.bean(SmsQuota.class))));

    // Appelé pendant le traitement des classes @Configuration : on ne fait qu'ajouter des définitions,
    // aucun bean n'existe encore. Les suppliers ne tourneront qu'à l'instanciation des singletons.
    @Override
    public void register(BeanRegistry registry, Environment env) {
        List<String> channels = Arrays.stream(env.getProperty("tixa.notifiers", "").split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        for (int i = 0; i < channels.size(); i++) {
            String channel = channels.get(i);
            Function<BeanRegistry.SupplierContext, Notifier> recipe = CHANNELS.get(channel);
            if (recipe == null) {
                throw new IllegalStateException("canal de notification inconnu : " + channel
                        + " (connus : " + String.join(", ", CHANNELS.keySet()) + ")");
            }
            boolean first = i == 0;
            registry.registerBean(channel + "Notifier", Notifier.class, spec -> {
                spec.supplier(recipe);
                if (first) spec.primary();
            });
        }
    }
}
