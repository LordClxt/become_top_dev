/** Des vérifications de démonstration. */
class Samples {
    @Check static void a_passes() { }

    @Check static void b_fails() { throw new IllegalStateException("solde négatif"); }

    @ExpectThrows(ArithmeticException.class)
    static void c_divides() { int zero = 0; System.out.println(1 / zero); }

    @ExpectThrows({ IndexOutOfBoundsException.class, NullPointerException.class })
    static void d_nulls() { String s = null; s.length(); }

    @ExpectThrows(ArithmeticException.class)
    static void e_noException() { }

    @ExpectThrows(ArithmeticException.class)
    static void f_wrongException() { throw new IllegalArgumentException("x"); }

    @Check void g_instance() { }

    @Check static void h_withParameter(int x) { }

    static void i_notAnnotated() { throw new AssertionError("jamais appelée"); }
}
