FROM mirror.gcr.io/library/golang:1.25-alpine AS build

WORKDIR /src
COPY services/profile-go/go.mod services/profile-go/go.sum ./
RUN go mod download

COPY services/profile-go/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -trimpath -ldflags="-s -w" -o /out/profile-go .

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/profile-go /profile-go
COPY packages/db/certs/rds-global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem

ENV PORT=8080
ENV RDS_CA_PATH=/etc/ssl/certs/rds-global-bundle.pem
EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/profile-go"]
