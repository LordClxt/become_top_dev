import java.util.SequencedMap;

/** Le devis : prix de chaque colis (ordre des colis), remise et total, en centimes. NE PAS MODIFIER. */
record Quote(SequencedMap<String, Long> perParcel, long discount, long total) { }
