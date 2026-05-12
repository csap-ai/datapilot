package appdata

import (
	"os"
	"path/filepath"
	"runtime"
)

const appName = "DataPilot"

func Dir() (string, error) {
	dir, err := resolve()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return dir, nil
}

func resolve() (string, error) {
	switch runtime.GOOS {
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", appName), nil

	case "windows":
		local := os.Getenv("LOCALAPPDATA")
		if local == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			local = filepath.Join(home, "AppData", "Local")
		}
		return filepath.Join(local, appName), nil

	default:
		// Linux / BSD — follow XDG
		xdg := os.Getenv("XDG_DATA_HOME")
		if xdg == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			xdg = filepath.Join(home, ".local", "share")
		}
		return filepath.Join(xdg, "datapilot"), nil
	}
}
