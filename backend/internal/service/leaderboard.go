package service

import (
	"context"
	"slices"
	"time"
)

// Classement hebdomadaire des membres.

type LeaderboardEntry struct {
	UserID      int64  `json:"user_id"`
	DisplayName string `json:"display_name"`
	HasAvatar   bool   `json:"has_avatar"`
	XPWeek      int    `json:"xp_week"`
	XPTotal     int    `json:"xp_total"`
	Level       int    `json:"level"`
	StreakDays  int    `json:"streak_days"`
	Me          bool   `json:"me"`
}

type Leaderboard struct {
	WeekStart string             `json:"week_start"`
	Entries   []LeaderboardEntry `json:"entries"`
}

// Leaderboard : la semaine commence le lundi à 0 h dans le fuseau de celui qui demande ; les séries de chacun
// sont comptées dans ce même fuseau.
func (s *Service) Leaderboard(ctx context.Context, uid int64, today time.Time, tz string) (*Leaderboard, error) {
	start := WeekStart(today)
	rows, err := s.repos().Users.Leaderboard(ctx, start, tz)
	if err != nil {
		return nil, err
	}
	out := &Leaderboard{WeekStart: isoDate(start), Entries: []LeaderboardEntry{}}
	for _, m := range rows {
		days, err := s.repos().Progress(m.ID).ActiveDays(ctx, tz)
		if err != nil {
			return nil, err
		}
		out.Entries = append(out.Entries, LeaderboardEntry{
			UserID: m.ID, DisplayName: m.DisplayName, HasAvatar: m.HasAvatar, XPWeek: m.XPWeek, XPTotal: m.XPTotal,
			Level: LevelForXP(m.XPTotal), StreakDays: Streak(days, today), Me: m.ID == uid,
		})
	}
	slices.SortStableFunc(out.Entries, func(a, b LeaderboardEntry) int {
		if a.XPWeek != b.XPWeek {
			return b.XPWeek - a.XPWeek
		}
		return b.XPTotal - a.XPTotal
	})
	return out, nil
}
