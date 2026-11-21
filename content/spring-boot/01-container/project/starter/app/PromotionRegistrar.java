package app;

import org.springframework.beans.factory.BeanRegistrar;
import org.springframework.beans.factory.BeanRegistry;
import org.springframework.core.env.Environment;

/** Un bean Promotion par code listé dans tixa.promotions (M3). */
public class PromotionRegistrar implements BeanRegistrar {

    @Override
    public void register(BeanRegistry registry, Environment env) {
        // TODO (M3)
    }
}
