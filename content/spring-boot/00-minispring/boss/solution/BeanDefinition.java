/** La recette d'un bean (classes à un seul constructeur). Fourni. */
public record BeanDefinition(String name, Class<?> type, boolean prototype) {
    public BeanDefinition withPrototype(boolean p) { return new BeanDefinition(name, type, p); }
}
