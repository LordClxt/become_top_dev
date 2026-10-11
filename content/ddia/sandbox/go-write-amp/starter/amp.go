package lab

// BTreeWriteAmp renvoie l'amplification en écriture d'une mise à jour d'un B-tree : la modification est écrite une
// fois dans le WAL (recordSize octets) puis la page entière est réécrite (pageSize octets), le tout rapporté aux
// recordSize octets que l'application a écrits. recordSize <= 0 renvoie 0.
func BTreeWriteAmp(recordSize, pageSize int) float64 {
	// TODO
	panic("à implémenter")
}

// MaxLevels renvoie le plus petit nombre de niveaux L >= 1 tel que branching^L >= n : la profondeur d'un B-tree
// qui doit référencer n pages avec ce facteur de branchement. branching < 2 renvoie 0.
func MaxLevels(n, branching int) int {
	// TODO
	panic("à implémenter")
}

// CapacityBytes renvoie la quantité de données qu'un B-tree de `levels` niveaux peut adresser :
// branching^levels pages de pageSize octets.
func CapacityBytes(levels, branching, pageSize int) int64 {
	// TODO
	panic("à implémenter")
}

// Result est le bilan d'une simulation de LSM-tree.
type Result struct {
	UserBytes    int64   // octets écrits par l'application
	TotalWritten int64   // octets écrits sur disque : WAL + flush + compactions
	Segments     int     // SSTables restantes
	Amp          float64 // TotalWritten / UserBytes
}

// SimulateSizeTiered simule un LSM-tree à compaction size-tiered. Chaque flush de memtable écrit flushBytes octets
// (qui ont aussi été écrits dans le WAL) dans une SSTable de niveau 0. Dès qu'un niveau contient fanIn SSTables, elles
// sont fusionnées en une SSTable du niveau suivant, de taille égale à la somme (on suppose qu'aucune clé n'est en
// double) : la fusion écrit cette taille sur disque. La cascade se poursuit niveau par niveau.
// flushes <= 0, flushBytes <= 0 ou fanIn < 2 : résultat nul.
func SimulateSizeTiered(flushBytes int64, flushes, fanIn int) Result {
	// TODO
	panic("à implémenter")
}
