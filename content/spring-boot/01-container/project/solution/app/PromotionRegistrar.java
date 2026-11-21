package app;

import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.BeanRegistrar;
import org.springframework.beans.factory.BeanRegistry;
import org.springframework.core.env.Environment;

/** Un bean Promotion par code listé dans tixa.promotions (M3). */
public class PromotionRegistrar implements BeanRegistrar {
    private static final Pattern ENTRY = Pattern.compile("([A-Z0-9]+):(\\d{1,2})");

    @Override
    public void register(BeanRegistry registry, Environment env) {
        Arrays.stream(env.getProperty("tixa.promotions", "").split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .forEach(entry -> {
                    Matcher m = ENTRY.matcher(entry);
                    int percent = m.matches() ? Integer.parseInt(m.group(2)) : 0;
                    if (percent < 1 || percent > 90) {
                        throw new IllegalStateException("promotion invalide : '" + entry
                                + "' (attendu CODE:pourcentage, de 1 à 90)");
                    }
                    Promotion promotion = new Promotion(m.group(1), percent);
                    registry.registerBean("promotion-" + promotion.code(), Promotion.class,
                            spec -> spec.supplier(ctx -> promotion));
                });
    }
}
