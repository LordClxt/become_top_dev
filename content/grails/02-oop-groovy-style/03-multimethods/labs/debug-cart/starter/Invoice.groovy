class Invoice {
    final Cart cart

    Invoice(Cart cart) { this.cart = cart }

    // Une ligne par article : on fusionne les éventuels doublons pour l'affichage.
    List<Line> displayLines() {
        cart.lines().unique()
    }

    String render() {
        (displayLines()*.toString() + ["Total : ${cart.total()} €"]).join('\n')
    }
}
