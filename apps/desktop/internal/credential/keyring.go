package credential

import (
	"errors"

	"github.com/zalando/go-keyring"
)

type KeyringStore struct{}

func NewKeyringStore() *KeyringStore {
	return &KeyringStore{}
}

func (k *KeyringStore) Set(service, account, secret string) error {
	return keyring.Set(service, account, secret)
}

func (k *KeyringStore) Get(service, account string) (string, error) {
	s, err := keyring.Get(service, account)
	if err != nil {
		if errors.Is(err, keyring.ErrNotFound) {
			return "", ErrNotFound
		}
		return "", err
	}
	return s, nil
}

func (k *KeyringStore) Delete(service, account string) error {
	err := keyring.Delete(service, account)
	if err != nil {
		if errors.Is(err, keyring.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}
	return nil
}
