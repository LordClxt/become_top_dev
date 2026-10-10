package service

import (
	"bytes"
	"context"
)

const MaxAvatarBytes = 2 * 1024 * 1024

// sniffImageType déduit le type des premiers octets, jamais de l'en-tête envoyé par le client.
func sniffImageType(data []byte) string {
	switch {
	case bytes.HasPrefix(data, []byte("\x89PNG\r\n\x1a\n")):
		return "image/png"
	case bytes.HasPrefix(data, []byte("\xff\xd8\xff")):
		return "image/jpeg"
	case len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return "image/webp"
	}
	return ""
}

type ProfileView struct {
	AvatarVersion *int64 `json:"avatar_version"`
}

func (s *Service) Profile(ctx context.Context) (*ProfileView, error) {
	p, err := s.repos().Profile.Get(ctx)
	if err != nil || p == nil || p.Avatar == nil || p.AvatarUpdatedAt == nil {
		return &ProfileView{}, err
	}
	return &ProfileView{AvatarVersion: new(p.AvatarUpdatedAt.UnixMilli())}, nil
}

func (s *Service) Avatar(ctx context.Context) ([]byte, string, error) {
	p, err := s.repos().Profile.Get(ctx)
	if err != nil {
		return nil, "", err
	}
	if p == nil || p.Avatar == nil || p.AvatarType == "" {
		return nil, "", errorf(NotFound, "pas d'avatar")
	}
	return p.Avatar, p.AvatarType, nil
}

func (s *Service) SetAvatar(ctx context.Context, data []byte) error {
	if len(data) == 0 {
		return errorf(Invalid, "fichier vide")
	}
	if len(data) > MaxAvatarBytes {
		return errorf(TooLarge, "image trop lourde (2 Mo maximum)")
	}
	ctype := sniffImageType(data)
	if ctype == "" {
		return errorf(Unsupported, "format non pris en charge (PNG, JPEG ou WebP)")
	}
	return s.repos().Profile.SetAvatar(ctx, data, ctype)
}

func (s *Service) RemoveAvatar(ctx context.Context) error {
	return s.repos().Profile.SetAvatar(ctx, nil, "")
}
