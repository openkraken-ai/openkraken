package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
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

	// Create Unix socket directory if it doesn't exist
	socketDir := socketPath
	if lastSlash := strings.LastIndex(socketPath, "/"); lastSlash > 0 {
		socketDir = socketPath[:lastSlash+1]
		if err := os.MkdirAll(socketDir, 0775); err != nil {
			log.Printf("Warning: Could not create socket directory: %v", err)
		}
	}

	// Remove existing socket file
	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		log.Printf("Warning: Could not remove existing socket: %v", err)
	}

	// Create Unix socket with proper permissions (0660)
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Printf("Failed to create Unix socket at %s, falling back to TCP: %v", socketPath, err)
		// Fall back to TCP
		listener, err = net.Listen("tcp", ":"+port)
		if err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	} else {
		// Set socket permissions to 0660 (owner rw, group rw)
		if err := os.Chmod(socketPath, 0660); err != nil {
			log.Printf("Warning: Could not set socket permissions: %v", err)
		}
		log.Printf("Egress Gateway listening on Unix socket: %s", socketPath)
	}

	// Handle both Unix socket and TCP connections
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ready"))
	})

	// Serve HTTP over the Unix socket
	if err := http.Serve(listener, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	fmt.Println("Egress Gateway started")
}
