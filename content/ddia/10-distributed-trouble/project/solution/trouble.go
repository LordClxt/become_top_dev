package lab

import (
	"errors"
	"fmt"
	"math"
)

// ---------- Jalon 1 : détecter une panne avec un délai d'attente ----------

// TimeoutBound est le délai d'attente raisonnable d'un système SYNCHRONE fictif : un paquet est livré en au plus d,
// un nœud vivant traite une requête en au plus r, donc toute réponse arrive en 2d + r.
func TimeoutBound(maxDelay, maxProcessing int64) int64 { return 2*maxDelay + maxProcessing }

// FailureDetector soupçonne un nœud d'être mort quand aucun battement de cœur n'est arrivé depuis plus longtemps que
// le délai d'attente, calculé à partir des intervalles récents : moyenne + k écarts-types, au moins `min`.
// Les temps sont en millisecondes, fournis par l'appelant (horloge monotone).
type FailureDetector struct {
	window    int
	k         float64
	min       int64
	last      int64
	hasLast   bool
	intervals []int64
}

func NewFailureDetector(window int, k float64, minTimeoutMs int64) *FailureDetector {
	return &FailureDetector{window: window, k: k, min: minTimeoutMs}
}

// Heartbeat enregistre un battement de cœur reçu à l'instant now et retient les `window` derniers intervalles.
func (d *FailureDetector) Heartbeat(now int64) {
	if d.hasLast {
		d.intervals = append(d.intervals, now-d.last)
		if len(d.intervals) > d.window {
			d.intervals = d.intervals[len(d.intervals)-d.window:]
		}
	}
	d.last, d.hasLast = now, true
}

// Timeout renvoie le délai d'attente courant : tant qu'on a moins de 2 intervalles, `min` ; ensuite
// ceil(moyenne + k × écart-type) (écart-type de la population), jamais en dessous de `min`.
func (d *FailureDetector) Timeout() int64 {
	if len(d.intervals) < 2 {
		return d.min
	}
	var sum float64
	for _, v := range d.intervals {
		sum += float64(v)
	}
	mean := sum / float64(len(d.intervals))
	var sq float64
	for _, v := range d.intervals {
		sq += (float64(v) - mean) * (float64(v) - mean)
	}
	std := math.Sqrt(sq / float64(len(d.intervals)))
	t := int64(math.Ceil(mean + d.k*std))
	if t < d.min {
		return d.min
	}
	return t
}

// Suspected dit si le nœud est soupçonné à l'instant now : au moins un battement reçu, et now − dernier > Timeout().
func (d *FailureDetector) Suspected(now int64) bool {
	return d.hasLast && now-d.last > d.Timeout()
}

// ---------- Jalon 2 : horloges ----------

// Lamport est une horloge logique : elle ordonne les événements causalement, sans mesurer le temps.
type Lamport struct{ t uint64 }

// Tick avance l'horloge pour un événement local (ou un envoi) et renvoie le nouvel horodatage.
func (l *Lamport) Tick() uint64 {
	l.t++
	return l.t
}

// Receive intègre l'horodatage d'un message reçu : max(local, distant) + 1.
func (l *Lamport) Receive(remote uint64) uint64 {
	if remote > l.t {
		l.t = remote
	}
	l.t++
	return l.t
}

// LWWValue est une valeur horodatée ; Node départage deux horodatages égaux.
type LWWValue struct {
	Value string
	TS    uint64
	Node  string
}

// NewerLWW renvoie l'écriture qui gagne : le plus grand horodatage ; à égalité, le plus grand Node (ordre des chaînes).
func NewerLWW(a, b LWWValue) LWWValue {
	if a.TS != b.TS {
		if a.TS > b.TS {
			return a
		}
		return b
	}
	if a.Node >= b.Node {
		return a
	}
	return b
}

// Interval est une lecture d'horloge avec incertitude : le temps réel est quelque part dans [Earliest, Latest].
type Interval struct{ Earliest, Latest int64 }

// Before dit si a s'est SÛREMENT produit avant b : les intervalles ne se chevauchent pas (a.Latest < b.Earliest).
func (a Interval) Before(b Interval) bool { return a.Latest < b.Earliest }

// Overlaps dit si on ne peut pas ordonner a et b.
func (a Interval) Overlaps(b Interval) bool { return !a.Before(b) && !b.Before(a) }

// TrueTime simule l'API de Spanner : l'heure avec une incertitude ± eps.
type TrueTime struct {
	now func() int64
	eps int64
}

func NewTrueTime(now func() int64, eps int64) *TrueTime { return &TrueTime{now: now, eps: eps} }

// Now renvoie [maintenant − eps, maintenant + eps].
func (tt *TrueTime) Now() Interval {
	n := tt.now()
	return Interval{Earliest: n - tt.eps, Latest: n + tt.eps}
}

// After dit si ts est sûrement passé : Earliest > ts.
func (tt *TrueTime) After(ts int64) bool { return tt.Now().Earliest > ts }

// CommitWait attribue à une transaction l'horodatage ts = Now().Latest, puis attend (sleep(1) à répétition) que ts soit
// sûrement passé avant de rendre la main. Toute transaction qui démarre ensuite aura un intervalle strictement après ts.
func CommitWait(tt *TrueTime, sleep func(ms int64)) int64 {
	ts := tt.Now().Latest
	for !tt.After(ts) {
		sleep(1)
	}
	return ts
}

// ---------- Jalon 3 : baux et jetons de clôture ----------

// LockService accorde un bail (verrou avec expiration) ; chaque octroi renvoie un jeton de clôture strictement croissant.
type LockService struct {
	ttl     int64
	next    int
	holder  string
	expires int64
	held    bool
}

// NewLockService crée un service dont le premier jeton accordé vaut firstToken.
func NewLockService(ttlMs int64, firstToken int) *LockService {
	return &LockService{ttl: ttlMs, next: firstToken}
}

// Acquire demande le bail à l'instant now. Libre ou expiré (now ≥ expiration) → octroi à client avec un NOUVEAU jeton.
// Le titulaire courant qui redemande avant l'expiration prolonge son bail et garde le MÊME jeton. Sinon refusé (0, false).
func (l *LockService) Acquire(client string, now int64) (int, bool) {
	if l.held && l.holder == client && now < l.expires {
		l.expires = now + l.ttl
		return l.next - 1, true
	}
	if l.held && now < l.expires {
		return 0, false
	}
	l.held, l.holder, l.expires = true, client, now+l.ttl
	tok := l.next
	l.next++
	return tok, true
}

// Valid dit si client détient encore le bail avec ce jeton à l'instant now.
func (l *LockService) Valid(client string, token int, now int64) bool {
	return l.held && l.holder == client && token == l.next-1 && now < l.expires
}

// ErrStaleToken est renvoyée quand un jeton est plus ancien que le plus récent déjà vu.
var ErrStaleToken = errors.New("jeton de clôture périmé")

// FencedStorage protège une ressource : il refuse les écritures dont le jeton est inférieur au plus grand déjà vu.
type FencedStorage struct {
	maxToken int
	data     string
}

func (s *FencedStorage) Write(token int, data string) error {
	if token < s.maxToken {
		return ErrStaleToken
	}
	s.maxToken, s.data = token, data
	return nil
}

func (s *FencedStorage) Data() string { return s.data }

// Majority est la taille d'une majorité stricte parmi n nœuds.
func Majority(n int) int { return n/2 + 1 }

// DeclaredDead dit si un quorum de votes parmi n nœuds suffit à déclarer un nœud mort.
func DeclaredDead(votes, n int) bool { return votes >= Majority(n) }

// CheckFencing vérifie les propriétés de sûreté d'une suite de jetons accordés dans l'ordre : unicité et croissance stricte.
func CheckFencing(tokens []int) error {
	seen := map[int]bool{}
	for i, t := range tokens {
		if seen[t] {
			return fmt.Errorf("jeton %d accordé deux fois", t)
		}
		seen[t] = true
		if i > 0 && t < tokens[i-1] {
			return fmt.Errorf("jeton %d accordé après %d : la suite doit croître", t, tokens[i-1])
		}
	}
	return nil
}
