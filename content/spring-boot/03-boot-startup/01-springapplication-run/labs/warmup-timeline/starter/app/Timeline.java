package app;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.ApplicationEvent;
import org.springframework.context.ApplicationListener;

/** Note le nom simple de chaque événement reçu, et tout ce qu'on lui signale. Fourni : ne pas modifier. */
public class Timeline implements ApplicationListener<ApplicationEvent> {
    private final List<String> entries = new ArrayList<>();

    @Override
    public synchronized void onApplicationEvent(ApplicationEvent event) {
        String name = event.getClass().getSimpleName();
        if (name.startsWith("Application") || name.equals("ContextRefreshedEvent")) entries.add(name);
    }

    public synchronized void note(String entry) { entries.add(entry); }

    public synchronized List<String> entries() { return List.copyOf(entries); }
}
