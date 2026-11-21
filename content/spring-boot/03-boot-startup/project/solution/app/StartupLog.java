package app;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

/** Ce que l'exploitation lit après un déploiement. Fourni : ne pas modifier. */
@Component
public class StartupLog {
    private final List<String> lines = new ArrayList<>();

    public synchronized void add(String line) { lines.add(line); }

    public synchronized List<String> lines() { return List.copyOf(lines); }
}
