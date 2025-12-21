FROM alpine:3.19

RUN apk add --no-cache dnsmasq

COPY dnsmasq.conf /etc/dnsmasq.conf

EXPOSE 53/udp 53/tcp

CMD ["dnsmasq", "-k", "--log-facility=-"]
