#!/usr/bin/env bash
# Şablondan site dosyasını üretir (install-nginx.sh ve tests/deploy/nginx-site.sh kullanır): alan
# adı, uygulama portu, ek adlar, yönlendirme hedefi ve Cloudflare aralıkları (cloudflare-ips.txt)
# yerine yazılır. Şablonlar: nginx-site.conf (site), nginx-redirect.conf (eski adresten yönlendirme).
#   source docker/server/nginx-render.sh
#   render_site <alan-adı> <port> [şablon] [aralık-dosyası] [ek-adlar] [hedef-alan-adı]

# Aralık dosyasındaki adresler (yorum ve boş satırlar hariç). Biçimi bozuk satır ya da eksik liste
# hatadır: boş bir liste bütün ziyaretçileri dışarıda bırakırdı.
cloudflare_ranges() {
  local file=$1 line count=0
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%%#*}
    line=${line//[[:space:]]/}
    [ -z "$line" ] && continue
    if ! [[ $line =~ ^[0-9a-fA-F:.]+/[0-9]{1,3}$ ]]; then
      echo "Hata: $file içinde geçersiz aralık: $line" >&2
      return 1
    fi
    printf '%s\n' "$line"
    count=$((count + 1))
  done < "$file"
  if [ "$count" -lt 10 ]; then
    echo "Hata: $file içinde yalnızca $count aralık var; liste eksik görünüyor." >&2
    return 1
  fi
}

# Alan adı ya da ek ad olarak yalnızca küçük harf, rakam, nokta ve tire geçer (site dosyasına
# beklenmedik bir şey yazılmasın).
valid_names() {
  local name
  for name in "$@"; do
    if ! [[ $name =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
      echo "Hata: geçersiz alan adı: $name" >&2
      return 1
    fi
  done
}

render_site() {
  local domain=$1 port=$2 template=${3:-nginx-site.conf} ranges_file=${4:-cloudflare-ips.txt}
  local aliases=${5:-} target=${6:-}
  local ranges line range site_id
  # shellcheck disable=SC2086 # ek adlar boşlukla ayrılır
  valid_names "$domain" $aliases ${target:+"$target"} || return 1
  [[ $port =~ ^[0-9]+$ ]] || { echo "Hata: geçersiz port: $port" >&2; return 1; }
  # nginx'in geo değişkeni bütün siteler için ortaktır; her site dosyası kendi adını kullanır
  # (iki site dosyası aynı adı tanımlarsa nginx -t düşer).
  site_id=${domain//[^a-z0-9]/_}
  ranges=$(cloudflare_ranges "$ranges_file") || return 1
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *__CLOUDFLARE_REAL_IP__*)
        while IFS= read -r range; do printf '    set_real_ip_from %s;\n' "$range"; done <<< "$ranges" ;;
      *__CLOUDFLARE_GEO__*)
        while IFS= read -r range; do printf '    %s 1;\n' "$range"; done <<< "$ranges" ;;
      *)
        line=${line//__SITE_ID__/$site_id}
        line=${line//__DOMAIN__/$domain}
        line=${line//__ALIASES__/${aliases:+ $aliases}}
        line=${line//__TARGET__/$target}
        printf '%s\n' "${line//__PORT__/$port}" ;;
    esac
  done < "$template"
}
