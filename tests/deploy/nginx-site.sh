#!/usr/bin/env bash
# nginx girişinin denemesi (CI, Lint işi): şablon depodaki Cloudflare listesiyle üretilir, yerel
# bir nginx'te açılır ve curl ile sınanır. Sunucuya ve Docker'a gerek yoktur.
# - Cloudflare listesinde olmayan adresten gelen bağlantı kesilir (444, curl "boş yanıt"),
#   sunucunun kendisi (127.0.0.1) girer (sabah soruları 23).
# - Cloudflare'den gelen bağlantıda ziyaretçi adresi CF-Connecting-IP'den alınır; listede olmayan
#   adresin gönderdiği CF-Connecting-IP yok sayılır (güvenlik turu 5).
# - Ek ad (www) ve eski adres (yönlendirme girişi, nginx-redirect.conf) ana adrese yönlenir; iki
#   giriş aynı nginx'te birlikte açılır (geo değişkenleri çakışmaz).
# - Bozuk ya da eksik aralık listesiyle site dosyası üretilmez.
# Cloudflare'in bir uç sunucusu yerine 127.0.0.2 kullanılır (listeye yalnızca bu denemede eklenir).
#   bash tests/deploy/nginx-site.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
command -v nginx > /dev/null || { echo "nginx kurulu değil (sudo apt-get install -y nginx)."; exit 1; }
# shellcheck source=docker/server/nginx-render.sh
source "$root/docker/server/nginx-render.sh"

work=$(mktemp -d)
upstream_pid=""
# -e: nginx ayarı okumadan önce de günlük açar; root olmayan CI kullanıcısı /var/log/nginx'e yazamaz.
run_nginx() { nginx -p "$work" -e "$work/logs/error.log" -c "$work/nginx.conf" "$@"; }
stop_nginx() {
  if [ -f "$work/nginx.pid" ]; then run_nginx -s stop 2> /dev/null || true; fi
  sleep 0.3
}
cleanup() {
  stop_nginx
  if [ -n "$upstream_pid" ]; then kill "$upstream_pid" 2> /dev/null || true; fi
  rm -rf "$work"
}
trap cleanup EXIT

domain=cyberguard.test
alias=www.cyberguard.test
old=eski.cyberguard.test
http_port=18080
https_port=18443
app_port=18090
fail=0
check() { # check <açıklama> <beklenen> <gelen>
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; else echo "  ✗ $1 (beklenen: $2, gelen: $3)"; fail=1; fi
}

# Uygulama yerine: X-Forwarded-For başlığını gövdeye yazan küçük bir sunucu.
cat > "$work/upstream.py" << 'PY'
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = (self.headers.get("X-Forwarded-For") or "-").encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
python3 "$work/upstream.py" "$app_port" &
upstream_pid=$!

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$domain" \
  -addext "subjectAltName=DNS:$domain,DNS:$alias,DNS:$old" -keyout "$work/origin-key.pem" -out "$work/origin-cert.pem" 2> /dev/null
mkdir -p "$work/tmp" "$work/logs"

# Site dosyaları: üretilir, portlar ve sertifika yolu denemeye göre değiştirilir. Ana giriş
# (ek adıyla) ve eski adresin yönlendirme girişi birlikte açılır.
local_paths() { # local_paths <alan-adı>
  sed -e "s|listen 80;|listen 127.0.0.1:$http_port;|" -e "s|listen 443 ssl;|listen 127.0.0.1:$https_port ssl;|" \
    -e '/listen \[::\]/d' -e "s|/etc/nginx/ssl/$1/|$work/|"
}
site() { # site <aralık-dosyası>
  render_site "$domain" "$app_port" "$root/docker/server/nginx-site.conf" "$1" "$alias" | local_paths "$domain"
  render_site "$old" 0 "$root/docker/server/nginx-redirect.conf" "$1" "" "$domain" | local_paths "$old"
}
start_nginx() { # start_nginx <aralık-dosyası>
  stop_nginx
  site "$1" > "$work/site.conf"
  cat > "$work/nginx.conf" << CONF
pid $work/nginx.pid;
error_log $work/logs/error.log;
events {}
http {
  access_log off;
  client_body_temp_path $work/tmp/body;
  proxy_temp_path $work/tmp/proxy;
  fastcgi_temp_path $work/tmp/fastcgi;
  uwsgi_temp_path $work/tmp/uwsgi;
  scgi_temp_path $work/tmp/scgi;
  include $work/site.conf;
}
CONF
  run_nginx -t -q
  run_nginx
  sleep 0.5
}
# İstek: çıktı "<durum kodu> <gövde>", bağlantı yanıtsız kapanırsa "kesildi". HOST ve REQ_PATH
# ortam değişkenleriyle başka bir ada ve yola sorulur.
ask() { # ask <kaynak-adres> <http|https> [curl seçenekleri]
  local from=$1 scheme=$2 port=$http_port out host=${HOST:-$domain}
  shift 2
  [ "$scheme" = https ] && port=$https_port
  # --noproxy: ortamdaki vekil sunucu (HTTPS_PROXY) denemenin isteğini başka yere götürmesin.
  if out=$(curl -sk --noproxy '*' --max-time 5 --interface "$from" --resolve "$host:$port:127.0.0.1" \
    -w ' %{http_code}' "$@" "$scheme://$host:$port${REQ_PATH:-/}"); then
    echo "${out##* } ${out% *}"
  else
    echo "kesildi"
  fi
}
# Yönlendirme: çıktı "<durum kodu> <Location>".
where() { # where <kaynak-adres> <http|https> <ad> <yol>
  local from=$1 scheme=$2 host=$3 path=$4 port=$http_port
  [ "$scheme" = https ] && port=$https_port
  curl -sk --noproxy '*' --max-time 5 --interface "$from" --resolve "$host:$port:127.0.0.1" \
    -o /dev/null -w '%{http_code} %{redirect_url}' "$scheme://$host:$port$path" || echo "kesildi"
}

echo "Gerçek Cloudflare listesiyle:"
start_nginx "$root/docker/server/cloudflare-ips.txt"
check "sunucunun kendisi girer (HTTPS)" "200 127.0.0.1" "$(ask 127.0.0.1 https)"
check "listede olmayan adres kesilir (HTTPS)" "kesildi" "$(ask 127.0.0.2 https)"
check "listede olmayan adres kesilir (HTTP)" "kesildi" "$(ask 127.0.0.2 http)"
redirect=$(ask 127.0.0.1 http)
check "sunucunun kendisi HTTPS'e yönlenir (HTTP)" "301" "${redirect%% *}"
check "ek ad (www) ana adrese yönlenir (HTTPS)" "301 https://$domain/odalar?x=1" \
  "$(where 127.0.0.1 https "$alias" '/odalar?x=1')"
check "ek ad (www) ana adrese yönlenir (HTTP)" "301 https://$domain/odalar" "$(where 127.0.0.1 http "$alias" /odalar)"
check "eski adres aynı yolla ana adrese yönlenir (HTTPS)" "301 https://$domain/oda/abc?y=2" \
  "$(where 127.0.0.1 https "$old" '/oda/abc?y=2')"
check "eski adres ana adrese yönlenir (HTTP)" "301 https://$domain/giris" "$(where 127.0.0.1 http "$old" /giris)"
check "eski adreste listede olmayan adres kesilir (HTTPS)" "kesildi" "$(HOST=$old ask 127.0.0.2 https)"
check "eski adreste listede olmayan adres kesilir (HTTP)" "kesildi" "$(HOST=$old ask 127.0.0.2 http)"

echo "127.0.0.2 Cloudflare'in uç sunucusuymuş gibi:"
grep -v '^#' "$root/docker/server/cloudflare-ips.txt" > "$work/ranges.txt"
echo "127.0.0.2/32" >> "$work/ranges.txt"
start_nginx "$work/ranges.txt"
check "Cloudflare'den gelen bağlantı girer, ziyaretçi adresi CF-Connecting-IP'den" "200 203.0.113.9" \
  "$(ask 127.0.0.2 https -H 'CF-Connecting-IP: 203.0.113.9' -H 'X-Forwarded-For: 198.51.100.1')"
check "Cloudflare dışından gönderilen CF-Connecting-IP yok sayılır" "200 127.0.0.1" \
  "$(ask 127.0.0.1 https -H 'CF-Connecting-IP: 203.0.113.9')"

echo "Bozuk ya da eksik liste:"
printf '173.245.48.0/20\n103.21.244.0/22\n' > "$work/short.txt"
if render_site "$domain" 1 "$root/docker/server/nginx-site.conf" "$work/short.txt" > /dev/null 2>&1; then
  check "eksik listeyle site dosyası üretilmez" "hata" "üretildi"
else
  check "eksik listeyle site dosyası üretilmez" "hata" "hata"
fi
if render_site "$domain" 1 "$root/docker/server/nginx-site.conf" "$work/ranges.txt" 'www.x; deny all' > /dev/null 2>&1; then
  check "geçersiz ek adla site dosyası üretilmez" "hata" "üretildi"
else
  check "geçersiz ek adla site dosyası üretilmez" "hata" "hata"
fi
{ cat "$work/ranges.txt"; echo "1.2.3.4/24; deny all"; } > "$work/bad.txt"
if render_site "$domain" 1 "$root/docker/server/nginx-site.conf" "$work/bad.txt" > /dev/null 2>&1; then
  check "geçersiz satırlı listeyle site dosyası üretilmez" "hata" "üretildi"
else
  check "geçersiz satırlı listeyle site dosyası üretilmez" "hata" "hata"
fi

if [ "$fail" != 0 ]; then
  echo "nginx girişi denemesi düştü."
  tail -20 "$work/logs/error.log" || true
  exit 1
fi
echo "nginx girişi denemesi geçti."
