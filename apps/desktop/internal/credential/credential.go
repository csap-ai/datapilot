package credential

import "errors"

var ErrNotFound = errors.New("credential: not found")

type Store interface {
	Set(service, account, secret string) error
	Get(service, account string) (string, error)
	Delete(service, account string) error
}
