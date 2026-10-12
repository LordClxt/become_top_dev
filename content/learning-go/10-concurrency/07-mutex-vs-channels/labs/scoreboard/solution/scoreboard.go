package lab

import "sync"

type Scoreboard struct {
	mu     sync.RWMutex
	scores map[string]int
}

func NewScoreboard() *Scoreboard {
	return &Scoreboard{scores: map[string]int{}}
}

func (s *Scoreboard) Add(name string, points int) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.scores[name] += points
	return s.scores[name]
}

func (s *Scoreboard) Get(name string) (int, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.scores[name]
	return v, ok
}

func (s *Scoreboard) Top() (string, int, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	best, bestPoints, found := "", 0, false
	for name, points := range s.scores {
		if !found || points > bestPoints || (points == bestPoints && name < best) {
			best, bestPoints, found = name, points, true
		}
	}
	return best, bestPoints, found
}

func (s *Scoreboard) Snapshot() map[string]int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cp := make(map[string]int, len(s.scores))
	for k, v := range s.scores {
		cp[k] = v
	}
	return cp
}
