package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pquerna/otp/totp"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run cmd/generate_totp/main.go <secret>")
	}

	secret := os.Args[1]
	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		log.Fatal("Failed to generate TOTP code:", err)
	}

	fmt.Printf("TOTP Code: %s\n", code)
}