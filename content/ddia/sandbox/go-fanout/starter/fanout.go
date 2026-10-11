package lab

// Strategy est une façon de produire le fil d'accueil d'un utilisateur.
type Strategy int

const (
	// ReadFanIn assemble le fil à la lecture : on cherche les tweets de chaque compte suivi (approche 1).
	ReadFanIn Strategy = iota
	// WriteFanOut prépare le fil à l'écriture : chaque tweet est copié dans le fil de chaque abonné (approche 2).
	WriteFanOut
	// Hybrid fait le fan-out à l'écriture sauf pour les célébrités, fusionnées à la lecture.
	Hybrid
)

// Workload décrit la charge du service.
type Workload struct {
	TweetsPerSec        float64 // tweets publiés par seconde
	TimelineReadsPerSec float64 // fils d'accueil consultés par seconde

	// Followers contient le nombre d'abonnés de chaque compte qui publie. Chaque entrée publie au même rythme :
	// la moyenne de la liste est donc le nombre moyen d'abonnés atteints par un tweet.
	Followers []int

	AvgFollowing           float64 // nombre moyen de comptes suivis par un lecteur
	CelebrityThreshold     int     // Hybrid : un compte avec strictement plus d'abonnés est une célébrité
	AvgCelebritiesFollowed float64 // Hybrid : nombre moyen de célébrités suivies par un lecteur
}

// Cost est le travail demandé au système, en opérations par seconde.
type Cost struct {
	WritesPerSec float64 // écritures (insertions dans des fils)
	ReadsPerSec  float64 // lectures (recherches des tweets d'un compte)
}

// Total renvoie le travail total par seconde.
func (c Cost) Total() float64 {
	// TODO
	panic("à implémenter")
}

// Estimate renvoie le coût moyen par seconde de la stratégie s sous la charge w.
//
//   - ReadFanIn : chaque tweet coûte 1 écriture ; chaque lecture de fil coûte AvgFollowing recherches.
//   - WriteFanOut : chaque tweet coûte autant d'écritures que d'abonnés ; chaque lecture coûte 1 recherche.
//   - Hybrid : comme WriteFanOut, sauf qu'un tweet de célébrité coûte 1 écriture ;
//     chaque lecture coûte 1 recherche, plus une par célébrité suivie (AvgCelebritiesFollowed).
//
// Sans compte qui publie (Followers vide), la moyenne d'écritures par tweet est 0.
func Estimate(s Strategy, w Workload) Cost {
	// TODO
	panic("à implémenter")
}

// MaxFanOut renvoie le plus grand nombre d'écritures déclenchées par un seul tweet sous la stratégie s :
// c'est la rafale que le système doit absorber dans le pire cas. Sans compte qui publie, 0.
func MaxFanOut(s Strategy, w Workload) int {
	// TODO
	panic("à implémenter")
}
