# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build API binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/api ./cmd/api

# Build Worker binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/worker ./cmd/worker

# API stage
FROM alpine:latest AS api
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/bin/api .
EXPOSE 8080
CMD ["./api"]

# Worker stage
FROM alpine:latest AS worker
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/bin/worker .
CMD ["./worker"]
