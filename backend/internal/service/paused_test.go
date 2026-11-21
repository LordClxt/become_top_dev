package service

import (
	"testing"

	"btd/backend/internal/content"
)

func TestOrderedCoursesSkipsPaused(t *testing.T) {
	one, two, three := 1, 2, 3
	s := &Service{Content: &content.Index{
		Courses: map[string]*content.Course{
			"java": {ID: "java", Order: &two},
			"ts":   {ID: "ts", Order: &one, Paused: true},
			"ddia": {ID: "ddia", Order: &three},
		},
		CourseOrder: []string{"ddia", "java", "ts"},
	}}
	got := []string{}
	for _, c := range s.orderedCourses() {
		got = append(got, c.ID)
	}
	if len(got) != 2 || got[0] != "java" || got[1] != "ddia" {
		t.Fatalf("orderedCourses() = %v, attendu [java ddia]", got)
	}
}
