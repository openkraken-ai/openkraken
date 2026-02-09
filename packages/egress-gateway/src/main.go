package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("EGRESS_GATEWAY_PORT")
	if port == "" {
		port = "3001"
	}

	socketPath := os.Getenv("EGRESS_SOCKET_PATH")
	if socketPath == "" {
		socketPath = "/tmp/openkraken-egress.sock"
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ready"))
	})

	log.Printf("Egress Gateway starting on port %s", port)
	log.Printf("Socket path: %s", socketPath)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	fmt.Println("Egress Gateway started")
}
