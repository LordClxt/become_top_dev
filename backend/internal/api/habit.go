package api

import (
	"net/http"
	"slices"
	"strconv"

	"btd/backend/internal/service"
)

// Boucle d'habitude : aujourd'hui (objectif, quêtes, coffre), révisions, classement, objectif quotidien.

func (s *Server) today(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Today(r.Context(), uid(r), today, tz)
		respond(w, v, err)
	}
}

func (s *Server) claimQuest(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.ClaimQuest(r.Context(), uid(r), today, tz, r.PathValue("id"))
		respond(w, v, err)
	}
}

func (s *Server) claimChest(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.ClaimChest(r.Context(), uid(r), today, tz)
		respond(w, v, err)
	}
}

func (s *Server) review(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Review(r.Context(), uid(r), today, tz)
		respond(w, v, err)
	}
}

// rateCard : l'id public d'une carte contient un « / » (<lessonId>/<cardId>), d'où le joker {card...}.
func (s *Server) rateCard(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Rating string `json:"rating"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Rating != "known" && body.Rating != "review" {
		writeError(w, http.StatusUnprocessableEntity, `rating : "known" ou "review"`)
		return
	}
	if today, _, ok := userDay(w, r); ok {
		v, err := s.svc.RateCard(r.Context(), uid(r), today, r.PathValue("card"), body.Rating == "known")
		respond(w, v, err)
	}
}

func (s *Server) leaderboard(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Leaderboard(r.Context(), uid(r), today, tz)
		respond(w, v, err)
	}
}

func (s *Server) setGoal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		GoalXP *int `json:"goal_xp"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.GoalXP == nil || !slices.Contains(service.DailyGoals, *body.GoalXP) {
		writeError(w, http.StatusUnprocessableEntity, "goal_xp : 20, 50, 100 ou 150")
		return
	}
	noContent(w, s.svc.SetDailyGoal(r.Context(), uid(r), *body.GoalXP))
}

// memberAvatar sert l'avatar d'un autre membre (classement), avec les mêmes en-têtes que le sien.
func (s *Server) memberAvatar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusNotFound, "pas d'avatar")
		return
	}
	s.writeAvatar(w, r, id)
}
