/** Voit passer chaque bean créé ; ce qu'il renvoie remplace le bean. Fourni : ne pas modifier. */
public interface BeanPostProcessor {
    default Object before(String name, Object bean) { return bean; }
    default Object after(String name, Object bean) { return bean; }
}
