# ── Imagen de producción para BTAJ MX AR ─────────────────────
# Stack: Nginx Alpine sirviendo archivos estáticos.
# Assets de obras (videos, targets) se montan desde el host para
# poder agregar obra nueva sin reconstruir la imagen.

FROM nginx:alpine

# Eliminar config por defecto
RUN rm /etc/nginx/conf.d/default.conf

# ── Código estático (se reconstruye con cada release) ─────────
COPY ar/           /app/ar/
COPY assets/css/   /app/assets/css/
COPY assets/js/    /app/assets/js/
COPY assets/lib/   /app/assets/lib/
COPY assets/brand/ /app/assets/brand/
COPY 404.html      /app/404.html

# artworks.json y assets/artworks/ se montan como bind-mount
# desde el host (ver docker-compose.yml → volumes) para poder
# publicar obra nueva haciendo rsync + docker compose restart,
# sin necesidad de reconstruir la imagen.

# ── Nginx sin SSL (Traefik termina TLS) ───────────────────────
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
