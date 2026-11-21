/** Voit passer chaque bean créé après lui ; ce qu'il renvoie remplace le bean. Fourni. */
public interface BeanPostProcessor {
    Object after(String name, Object bean);
}
