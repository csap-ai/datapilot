package main

import (
	"context"
	"time"
)

type App struct {
	ctx context.Context
}

type HealthStatus struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Runtime   string `json:"runtime"`
	Timestamp string `json:"timestamp"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Health() HealthStatus {
	return HealthStatus{
		Status:    "ok",
		Service:   "datapilot-desktop",
		Runtime:   "wails",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}
