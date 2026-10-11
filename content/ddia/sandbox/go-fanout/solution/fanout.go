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
func (c Cost) Total() float64 { return c.WritesPerSec + c.ReadsPerSec }

// writeCost renvoie le nombre d'écritures déclenchées par un tweet d'un compte qui a followers abonnés.
func writeCost(s Strategy, followers int, w Workload) int {
	switch s {
	case ReadFanIn:
		return 1 // une insertion dans la collection globale
	case WriteFanOut:
		return followers
	default: // Hybrid
		if followers > w.CelebrityThreshold {
			return 1 // une célébrité n'est pas diffusée dans les fils
		}
		return followers
	}
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
	mean := 0.0
	for _, followers := range w.Followers {
		mean += float64(writeCost(s, followers, w))
	}
	if len(w.Followers) > 0 {
		mean /= float64(len(w.Followers))
	}

	cost := Cost{WritesPerSec: w.TweetsPerSec * mean}
	switch s {
	case ReadFanIn:
		cost.ReadsPerSec = w.TimelineReadsPerSec * w.AvgFollowing
	case WriteFanOut:
		cost.ReadsPerSec = w.TimelineReadsPerSec
	default:
		cost.ReadsPerSec = w.TimelineReadsPerSec * (1 + w.AvgCelebritiesFollowed)
	}
	return cost
}

// MaxFanOut renvoie le plus grand nombre d'écritures déclenchées par un seul tweet sous la stratégie s :
// c'est la rafale que le système doit absorber dans le pire cas. Sans compte qui publie, 0.
func MaxFanOut(s Strategy, w Workload) int {
	worst := 0
	for _, followers := range w.Followers {
		worst = max(worst, writeCost(s, followers, w))
	}
	return worst
}
