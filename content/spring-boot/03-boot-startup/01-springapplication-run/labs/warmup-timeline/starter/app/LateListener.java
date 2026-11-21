package app;

import org.springframework.boot.context.event.ApplicationStartingEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

/** Un écouteur déclaré comme bean, pour le tout premier événement. Fourni : ne pas modifier. */
@Component
public class LateListener implements ApplicationListener<ApplicationStartingEvent> {
    public static int received;

    @Override
    public void onApplicationEvent(ApplicationStartingEvent event) { received++; }
}
